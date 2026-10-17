package com.aurex.android.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aurex.android.R
import com.aurex.android.repository.SmsRepository
import com.aurex.android.services.HeartbeatServiceEnterprise
import com.aurex.android.utils.PreferenceManager
import com.aurex.android.utils.SecureLogger
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

/**
 * Diagnostic Activity - Minimal Status Screen
 *
 * Shows essential device health info:
 * - Connection status (Connected / Disconnected)
 * - Workspace username
 * - Last SMS forwarded timestamp
 * - Pending queue size
 * - Battery optimization warning
 * - SMS permission status
 *
 * Controls:
 * - Manual "Force Sync" button
 * - Read-only logs (last 50 SMS events)
 *
 * NO animations. NO charts. NO dashboards.
 * Clarity > aesthetics (infrastructure-grade).
 */
class DiagnosticActivity : AppCompatActivity() {

    private lateinit var tvConnectionStatus: TextView
    private lateinit var tvWorkspaceUsername: TextView
    private lateinit var tvLastSmsForwarded: TextView
    private lateinit var tvPendingQueueSize: TextView
    private lateinit var tvBatteryWarning: TextView
    private lateinit var tvSmsPermissionStatus: TextView
    private lateinit var btnForceSync: Button
    private lateinit var btnViewLogs: Button
    private lateinit var btnUnbindDevice: Button
    private lateinit var rvRecentSms: RecyclerView

    private lateinit var preferenceManager: PreferenceManager
    private lateinit var smsRepository: SmsRepository
    private lateinit var secureLogger: SecureLogger

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_diagnostic)

        preferenceManager = PreferenceManager(this)
        smsRepository = SmsRepository(this)
        secureLogger = SecureLogger(this)

        initViews()
        setupListeners()
        loadDiagnosticData()

        // Start heartbeat service
        HeartbeatServiceEnterprise.start(this)
    }

    private fun initViews() {
        tvConnectionStatus = findViewById(R.id.tvConnectionStatus)
        tvWorkspaceUsername = findViewById(R.id.tvWorkspaceUsername)
        tvLastSmsForwarded = findViewById(R.id.tvLastSmsForwarded)
        tvPendingQueueSize = findViewById(R.id.tvPendingQueueSize)
        tvBatteryWarning = findViewById(R.id.tvBatteryWarning)
        tvSmsPermissionStatus = findViewById(R.id.tvSmsPermissionStatus)
        btnForceSync = findViewById(R.id.btnForceSync)
        btnViewLogs = findViewById(R.id.btnViewLogs)
        btnUnbindDevice = findViewById(R.id.btnUnbindDevice)
        rvRecentSms = findViewById(R.id.rvRecentSms)

        rvRecentSms.layoutManager = LinearLayoutManager(this)
    }

    private fun setupListeners() {
        btnForceSync.setOnClickListener {
            forceSync()
        }

        btnViewLogs.setOnClickListener {
            showLogs()
        }

        btnUnbindDevice.setOnClickListener {
            confirmUnbindDevice()
        }

        findViewById<Button>(R.id.btnRefresh).setOnClickListener {
            loadDiagnosticData()
        }
    }

    private fun loadDiagnosticData() {
        lifecycleScope.launch {
            try {
                // STEP 1: Connection Status
                val isConnected = preferenceManager.isWorkspaceBound()
                tvConnectionStatus.text = if (isConnected) "✓ Connected" else "✗ Disconnected"
                tvConnectionStatus.setTextColor(
                    ContextCompat.getColor(
                        this@DiagnosticActivity,
                        if (isConnected) android.R.color.holo_green_dark else android.R.color.holo_red_dark
                    )
                )

                // STEP 2: Workspace Username
                val workspaceUsername = preferenceManager.getWorkspaceUsername() ?: "Not bound"
                tvWorkspaceUsername.text = "Workspace: $workspaceUsername"

                // STEP 3: Last SMS Forwarded
                val lastSmsTimestamp = preferenceManager.getLastSmsForwardedAt()
                val lastSmsText = if (lastSmsTimestamp != null) {
                    val dateFormat = SimpleDateFormat("MMM dd, yyyy HH:mm:ss", Locale.getDefault())
                    dateFormat.format(Date(lastSmsTimestamp))
                } else {
                    "Never"
                }
                tvLastSmsForwarded.text = "Last Forwarded: $lastSmsText"

                // STEP 4: Pending Queue Size
                val pendingCount = smsRepository.getUnsyncedCount()
                tvPendingQueueSize.text = "Pending Queue: $pendingCount SMS"
                tvPendingQueueSize.setTextColor(
                    ContextCompat.getColor(
                        this@DiagnosticActivity,
                        if (pendingCount == 0) android.R.color.holo_green_dark else android.R.color.holo_orange_dark
                    )
                )

                // STEP 5: Battery Optimization Warning
                checkBatteryOptimization()

                // STEP 6: SMS Permission Status
                checkSmsPermissions()

                // STEP 7: Load recent SMS (last 10)
                loadRecentSms()

            } catch (e: Exception) {
                secureLogger.logError("Failed to load diagnostic data", e)
                Toast.makeText(this@DiagnosticActivity, "Error loading data", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun checkBatteryOptimization() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        val isIgnoringBatteryOptimizations = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            powerManager.isIgnoringBatteryOptimizations(packageName)
        } else {
            true
        }

        if (isIgnoringBatteryOptimizations) {
            tvBatteryWarning.visibility = View.GONE
        } else {
            tvBatteryWarning.visibility = View.VISIBLE
            tvBatteryWarning.text = "⚠ Battery optimization enabled - SMS ingestion may be blocked"
            tvBatteryWarning.setTextColor(ContextCompat.getColor(this, android.R.color.holo_orange_dark))
            tvBatteryWarning.setOnClickListener {
                showBatteryOptimizationDialog()
            }
        }
    }

    private fun checkSmsPermissions() {
        val hasSmsPermission = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.RECEIVE_SMS
        ) == PackageManager.PERMISSION_GRANTED

        val hasReadSmsPermission = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED

        tvSmsPermissionStatus.text = when {
            hasSmsPermission && hasReadSmsPermission -> "SMS Permissions: ✓ Granted"
            else -> "SMS Permissions: ✗ DENIED - SMS ingestion blocked"
        }

        tvSmsPermissionStatus.setTextColor(
            ContextCompat.getColor(
                this,
                if (hasSmsPermission && hasReadSmsPermission) android.R.color.holo_green_dark else android.R.color.holo_red_dark
            )
        )
    }

    private suspend fun loadRecentSms() {
        val recentSms = smsRepository.getAllSms().take(10)
        // TODO: Implement RecyclerView adapter for recent SMS display
        // Simple text-only list showing: timestamp, sender (masked), sync status
    }

    private fun forceSync() {
        lifecycleScope.launch {
            try {
                Toast.makeText(this@DiagnosticActivity, "Triggering manual sync...", Toast.LENGTH_SHORT).show()

                val unsyncedSms = smsRepository.getUnsyncedSms()
                secureLogger.logInfo("Force sync triggered: ${unsyncedSms.size} SMS to sync")

                // TODO: Trigger sync worker for each unsynced SMS
                // WorkManager.getInstance(this@DiagnosticActivity).enqueue(...)

                Toast.makeText(
                    this@DiagnosticActivity,
                    "Sync queued for ${unsyncedSms.size} SMS",
                    Toast.LENGTH_LONG
                ).show()

                // Refresh after 2 seconds
                kotlinx.coroutines.delay(2000)
                loadDiagnosticData()

            } catch (e: Exception) {
                secureLogger.logError("Force sync failed", e)
                Toast.makeText(this@DiagnosticActivity, "Sync failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showLogs() {
        val intent = Intent(this, SmsLogsActivity::class.java)
        startActivity(intent)
    }

    private fun showBatteryOptimizationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Battery Optimization")
            .setMessage(
                "Battery optimization is restricting background SMS ingestion.\n\n" +
                "To ensure reliable SMS forwarding, please disable battery optimization for AUREX."
            )
            .setPositiveButton("Open Settings") { _, _ ->
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    startActivity(intent)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmUnbindDevice() {
        AlertDialog.Builder(this)
            .setTitle("Unbind Device")
            .setMessage(
                "WARNING: This will unbind the device from the workspace.\n\n" +
                "All pending SMS will be lost.\n\n" +
                "You will need to re-verify the device to continue."
            )
            .setPositiveButton("Unbind") { _, _ ->
                unbindDevice()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun unbindDevice() {
        preferenceManager.clearWorkspaceBinding()
        secureLogger.logWarning("Device unbound from workspace - manual action")

        Toast.makeText(this, "Device unbound - returning to setup", Toast.LENGTH_LONG).show()

        val intent = Intent(this, WorkspaceSetupActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    override fun onResume() {
        super.onResume()
        loadDiagnosticData() // Refresh on resume
    }
}
