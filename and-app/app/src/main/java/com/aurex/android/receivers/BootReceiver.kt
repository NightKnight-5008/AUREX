package com.aurex.android.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.aurex.android.AurexApplication
import java.util.concurrent.TimeUnit

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
        private const val PERIODIC_SYNC_WORK_NAME = "aurex_periodic_sms_sync"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d(TAG, "Device boot completed, initializing Aurex services")

            // Check if user is logged in
            val userId = AurexApplication.preferenceManager.getUserId()
            val authToken = AurexApplication.preferenceManager.getAuthToken()

            if (userId != null && authToken != null) {
                Log.d(TAG, "User logged in, scheduling periodic sync")
                schedulePeriodicSync(context)
            } else {
                Log.d(TAG, "User not logged in, skipping sync scheduling")
            }
        }
    }

    private fun schedulePeriodicSync(context: Context) {
        // Schedule periodic sync every 15 minutes
        val periodicSyncRequest = PeriodicWorkRequestBuilder<PeriodicSmsSyncWorker>(
            15, TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicSyncRequest
        )

        Log.d(TAG, "Periodic SMS sync scheduled")
    }
}
