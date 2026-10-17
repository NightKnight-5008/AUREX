package com.aurex.android.ui

import android.app.Dialog
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.aurex.android.AurexApplication
import com.aurex.android.R
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.SemiAccount
import com.aurex.android.models.SemiAccountRequest
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch

class SemiAccountActivity : AppCompatActivity() {

    private lateinit var rvSemiAccounts: RecyclerView
    private lateinit var tvEmptyState: TextView
    private lateinit var btnCreateSemiAccount: ExtendedFloatingActionButton

    private val semiAccounts = mutableListOf<SemiAccount>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_semi_account)

        initViews()
        setupListeners()
        loadSemiAccounts()
    }

    private fun initViews() {
        rvSemiAccounts = findViewById(R.id.rvSemiAccounts)
        tvEmptyState = findViewById(R.id.tvEmptyState)
        btnCreateSemiAccount = findViewById(R.id.btnCreateSemiAccount)

        rvSemiAccounts.layoutManager = LinearLayoutManager(this)

        // Setup toolbar
        findViewById<View>(R.id.toolbar).setOnClickListener {
            finish()
        }
    }

    private fun setupListeners() {
        btnCreateSemiAccount.setOnClickListener {
            showCreateSemiAccountDialog()
        }
    }

    private fun loadSemiAccounts() {
        lifecycleScope.launch {
            try {
                val authToken = "Bearer ${AurexApplication.preferenceManager.getAuthToken()}"
                val response = RetrofitClient.apiService.getSemiAccounts(authToken)

                if (response.isSuccessful && response.body()?.success == true) {
                    val accounts = response.body()?.semiAccounts ?: emptyList()
                    semiAccounts.clear()
                    semiAccounts.addAll(accounts)
                    updateUI()
                } else {
                    Toast.makeText(
                        this@SemiAccountActivity,
                        "Failed to load semi-accounts",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@SemiAccountActivity,
                    "Error loading semi-accounts",
                    Toast.LENGTH_SHORT
                ).show()
                e.printStackTrace()
            }
        }
    }

    private fun showCreateSemiAccountDialog() {
        val dialog = Dialog(this)
        dialog.setContentView(R.layout.dialog_create_semi_account)

        val etSemiAccountName = dialog.findViewById<TextInputEditText>(R.id.etSemiAccountName)
        val etPhoneNumber = dialog.findViewById<TextInputEditText>(R.id.etPhoneNumber)
        val btnSave = dialog.findViewById<MaterialButton>(R.id.btnSave)
        val btnCancel = dialog.findViewById<MaterialButton>(R.id.btnCancel)

        btnSave.setOnClickListener {
            val name = etSemiAccountName.text.toString().trim()
            val phoneNumber = etPhoneNumber.text.toString().trim()

            if (name.isEmpty()) {
                etSemiAccountName.error = "Name is required"
                return@setOnClickListener
            }

            createSemiAccount(name, phoneNumber)
            dialog.dismiss()
        }

        btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun createSemiAccount(name: String, phoneNumber: String?) {
        lifecycleScope.launch {
            try {
                val authToken = "Bearer ${AurexApplication.preferenceManager.getAuthToken()}"
                val request = SemiAccountRequest(
                    name = name,
                    phoneNumber = phoneNumber
                )

                val response = RetrofitClient.apiService.createSemiAccount(authToken, request)

                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(
                        this@SemiAccountActivity,
                        getString(R.string.semi_account_created),
                        Toast.LENGTH_SHORT
                    ).show()
                    loadSemiAccounts() // Reload list
                } else {
                    Toast.makeText(
                        this@SemiAccountActivity,
                        response.body()?.message ?: getString(R.string.semi_account_error),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@SemiAccountActivity,
                    getString(R.string.semi_account_error),
                    Toast.LENGTH_SHORT
                ).show()
                e.printStackTrace()
            }
        }
    }

    private fun updateUI() {
        if (semiAccounts.isEmpty()) {
            rvSemiAccounts.visibility = View.GONE
            tvEmptyState.visibility = View.VISIBLE
        } else {
            rvSemiAccounts.visibility = View.VISIBLE
            tvEmptyState.visibility = View.GONE
            // TODO: Setup RecyclerView adapter
        }
    }
}
