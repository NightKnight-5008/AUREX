package com.aurex.android.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.aurex.android.R
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.WorkspaceVerificationRequest
import com.aurex.android.utils.PreferenceManager
import com.aurex.android.utils.SecureLogger
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Workspace Setup Activity - First launch device binding
 *
 * This is the ONLY entry point for unbound devices.
 * Binds device to exactly one workspace using:
 * - Workspace username (identifier)
 * - Device verification token (secure pairing)
 *
 * NO workspace browsing. NO workspace discovery.
 * Privacy-first, single workspace binding.
 */
class WorkspaceSetupActivity : AppCompatActivity() {

    private lateinit var etWorkspaceUsername: EditText
    private lateinit var etDeviceToken: EditText
    private lateinit var btnVerifyConnect: Button
    private lateinit var tvStatus: TextView
    private lateinit var tvError: TextView
    private lateinit var progressBar: ProgressBar

    private lateinit var preferenceManager: PreferenceManager
    private lateinit var secureLogger: SecureLogger

    private var deviceId: String = ""

    companion object {
        private const val TAG = "WorkspaceSetup"

        fun shouldShowSetup(context: Context): Boolean {
            val prefs = PreferenceManager(context)
            return !prefs.isWorkspaceBound()
        }

        fun start(context: Context) {
            val intent = Intent(context, WorkspaceSetupActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            context.startActivity(intent)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_workspace_setup)

        preferenceManager = PreferenceManager(this)
        secureLogger = SecureLogger(this)

        // Generate or retrieve device ID
        deviceId = preferenceManager.getDeviceId() ?: generateDeviceId()

        initViews()
        setupListeners()

        secureLogger.logInfo("Workspace setup screen launched - device requires binding")
    }

    private fun initViews() {
        etWorkspaceUsername = findViewById(R.id.etWorkspaceUsername)
        etDeviceToken = findViewById(R.id.etDeviceToken)
        btnVerifyConnect = findViewById(R.id.btnVerifyConnect)
        tvStatus = findViewById(R.id.tvStatus)
        tvError = findViewById(R.id.tvError)
        progressBar = findViewById(R.id.progressBar)

        // Show device ID for reference
        findViewById<TextView>(R.id.tvDeviceId).text = "Device ID: ${deviceId.take(8)}..."
    }

    private fun setupListeners() {
        btnVerifyConnect.setOnClickListener {
            val workspaceUsername = etWorkspaceUsername.text.toString().trim()
            val deviceToken = etDeviceToken.text.toString().trim()

            if (validateInput(workspaceUsername, deviceToken)) {
                verifyAndConnect(workspaceUsername, deviceToken)
            }
        }
    }

    private fun validateInput(username: String, token: String): Boolean {
        if (username.isEmpty()) {
            tvError.visibility = View.VISIBLE
            tvError.text = "Workspace username is required"
            return false
        }

        if (token.isEmpty()) {
            tvError.visibility = View.VISIBLE
            tvError.text = "Device verification token is required"
            return false
        }

        if (token.length < 16) {
            tvError.visibility = View.VISIBLE
            tvError.text = "Invalid token format - must be at least 16 characters"
            return false
        }

        tvError.visibility = View.GONE
        return true
    }

    private fun verifyAndConnect(workspaceUsername: String, deviceToken: String) {
        lifecycleScope.launch {
            try {
                showLoading(true)
                tvStatus.text = "Verifying device with workspace..."
                tvError.visibility = View.GONE

                val request = WorkspaceVerificationRequest(
                    workspaceUsername = workspaceUsername,
                    deviceToken = deviceToken,
                    deviceId = deviceId,
                    deviceName = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}",
                    appVersion = packageManager.getPackageInfo(packageName, 0).versionName
                )

                val response = RetrofitClient.apiService.verifyDeviceWorkspace(request)

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!

                    // Save workspace binding (LOCKED - cannot change)
                    preferenceManager.saveWorkspaceBinding(
                        workspaceId = data.workspaceId!!,
                        workspaceUsername = workspaceUsername,
                        deviceToken = data.deviceAuthToken!!,
                        deviceId = deviceId
                    )

                    tvStatus.text = "✓ Connected to workspace"
                    tvError.visibility = View.GONE

                    secureLogger.logInfo("Device successfully bound to workspace: ${data.workspaceId}")

                    // Success - navigate to main app
                    Toast.makeText(this@WorkspaceSetupActivity,
                        "Device connected to ${workspaceUsername}",
                        Toast.LENGTH_LONG).show()

                    navigateToMain()
                } else {
                    val errorMsg = response.body()?.message ?: "Verification failed"
                    showError(errorMsg)
                    secureLogger.logWarning("Workspace verification failed: $errorMsg")
                }
            } catch (e: Exception) {
                showError("Connection error: ${e.message}")
                secureLogger.logError("Workspace verification exception", e)
            } finally {
                showLoading(false)
            }
        }
    }

    private fun generateDeviceId(): String {
        val newDeviceId = UUID.randomUUID().toString()
        preferenceManager.saveDeviceId(newDeviceId)
        secureLogger.logInfo("Generated new device ID: ${newDeviceId.take(8)}...")
        return newDeviceId
    }

    private fun showLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnVerifyConnect.isEnabled = !loading
        etWorkspaceUsername.isEnabled = !loading
        etDeviceToken.isEnabled = !loading
    }

    private fun showError(message: String) {
        tvError.visibility = View.VISIBLE
        tvError.text = message
        tvStatus.text = ""
    }

    private fun navigateToMain() {
        val intent = Intent(this, DiagnosticActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    override fun onBackPressed() {
        // Prevent back navigation - must complete setup
        Toast.makeText(this, "Please complete workspace setup to continue", Toast.LENGTH_SHORT).show()
    }
}
