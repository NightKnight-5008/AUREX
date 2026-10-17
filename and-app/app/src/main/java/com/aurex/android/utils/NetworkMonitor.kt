package com.aurex.android.utils

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.aurex.android.AurexApplication
import com.aurex.android.receivers.PeriodicSmsSyncWorker

class NetworkMonitor(private val context: Context) {

    companion object {
        private const val TAG = "NetworkMonitor"
    }

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private var isMonitoring = false

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            super.onAvailable(network)
            Log.d(TAG, "Network available, triggering sync")
            triggerImmediateSync()
        }

        override fun onLost(network: Network) {
            super.onLost(network)
            Log.d(TAG, "Network lost")
        }
    }

    fun startMonitoring() {
        if (isMonitoring) return

        val networkRequest = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            .build()

        connectivityManager.registerNetworkCallback(networkRequest, networkCallback)
        isMonitoring = true
        Log.d(TAG, "Network monitoring started")
    }

    fun stopMonitoring() {
        if (!isMonitoring) return

        connectivityManager.unregisterNetworkCallback(networkCallback)
        isMonitoring = false
        Log.d(TAG, "Network monitoring stopped")
    }

    fun isNetworkAvailable(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun triggerImmediateSync() {
        val userId = AurexApplication.preferenceManager.getUserId()
        val authToken = AurexApplication.preferenceManager.getAuthToken()

        if (userId == null || authToken == null) {
            Log.w(TAG, "User not logged in, skipping sync")
            return
        }

        // Trigger immediate sync when network becomes available
        val syncWorkRequest = OneTimeWorkRequestBuilder<PeriodicSmsSyncWorker>().build()
        WorkManager.getInstance(context).enqueue(syncWorkRequest)
        Log.d(TAG, "Immediate sync triggered")
    }
}
