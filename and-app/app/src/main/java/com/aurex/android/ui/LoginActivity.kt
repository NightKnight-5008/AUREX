package com.aurex.android.ui

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.aurex.android.AurexApplication
import com.aurex.android.R
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.LoginRequest
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var etEmail: TextInputEditText
    private lateinit var etPassword: TextInputEditText
    private lateinit var etSecurityKey: TextInputEditText
    private lateinit var btnLogin: MaterialButton
    private lateinit var progressBar: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if user is already logged in
        if (AurexApplication.preferenceManager.isLoggedIn()) {
            navigateToMain()
            return
        }

        setContentView(R.layout.activity_login)

        initViews()
        setupListeners()
    }

    private fun initViews() {
        etEmail = findViewById(R.id.etEmail)
        etPassword = findViewById(R.id.etPassword)
        etSecurityKey = findViewById(R.id.etSecurityKey)
        btnLogin = findViewById(R.id.btnLogin)
        progressBar = findViewById(R.id.progressBar)
    }

    private fun setupListeners() {
        btnLogin.setOnClickListener {
            attemptLogin()
        }
    }

    private fun attemptLogin() {
        val email = etEmail.text.toString().trim()
        val password = etPassword.text.toString().trim()
        val securityKey = etSecurityKey.text.toString().trim()

        // Validation
        if (email.isEmpty()) {
            etEmail.error = "Email is required"
            etEmail.requestFocus()
            return
        }

        if (password.isEmpty()) {
            etPassword.error = "Password is required"
            etPassword.requestFocus()
            return
        }

        if (securityKey.isEmpty() || securityKey.length != 24) {
            etSecurityKey.error = "Security key must be 24 characters"
            etSecurityKey.requestFocus()
            return
        }

        performLogin(email, password, securityKey)
    }

    private fun performLogin(email: String, password: String, securityKey: String) {
        setLoading(true)

        lifecycleScope.launch {
            try {
                val loginRequest = LoginRequest(
                    email = email,
                    password = password,
                    securityKey = securityKey
                )

                val response = RetrofitClient.apiService.login(loginRequest)

                setLoading(false)

                if (response.isSuccessful && response.body()?.success == true) {
                    val loginResponse = response.body()!!
                    val user = loginResponse.user!!
                    val authToken = loginResponse.authToken!!

                    // Save user session
                    AurexApplication.preferenceManager.saveUserSession(
                        userId = user.id,
                        email = user.email,
                        authToken = authToken
                    )

                    // Schedule periodic SMS sync
                    AurexApplication.instance.schedulePeriodicSync()

                    Toast.makeText(
                        this@LoginActivity,
                        "Login successful!",
                        Toast.LENGTH_SHORT
                    ).show()

                    navigateToMain()
                } else {
                    val message = response.body()?.message ?: getString(R.string.login_error)
                    Toast.makeText(this@LoginActivity, message, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                setLoading(false)
                Toast.makeText(
                    this@LoginActivity,
                    getString(R.string.login_network_error),
                    Toast.LENGTH_LONG
                ).show()
                e.printStackTrace()
            }
        }
    }

    private fun setLoading(isLoading: Boolean) {
        progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        btnLogin.isEnabled = !isLoading
        etEmail.isEnabled = !isLoading
        etPassword.isEnabled = !isLoading
        etSecurityKey.isEnabled = !isLoading
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
