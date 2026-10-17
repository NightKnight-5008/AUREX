package com.aurex.android.services

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.*
import androidx.core.app.NotificationCompat
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.SyncHeartbeatRequest
import com.aurex.android.repository.SmsRepository
import kotlinx.coroutines.*
import java.util.*

/**
 * Background service that sends periodic heartbeat to server
 * to maintain "synced" status on web dashboard
 */
class SyncHeartbeatService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null

    companion object {
        private const val HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000L // 2 minutes
        private const val NOTIFICATION_ID = 2001

        fun start(context: Context) {
            val intent = Intent(context, SyncHeartbeatService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, SyncHeartbeatService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, createNotification())
        startHeartbeatLoop()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    private fun startHeartbeatLoop() {
        heartbeatJob = serviceScope.launch {
            while (isActive) {
                try {
                    sendHeartbeat()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    private suspend fun sendHeartbeat() {
        val sharedPrefs = getSharedPreferences("aurex_prefs", Context.MODE_PRIVATE)
        val authToken = sharedPrefs.getString("auth_token", null) ?: return
        val deviceId = sharedPrefs.getString("device_id", null) ?: UUID.randomUUID().toString().also {
            sharedPrefs.edit().putString("device_id", it).apply()
        }

        // Get device name
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"

        // Get phone count from semi-accounts
        val phoneCount = sharedPrefs.getInt("phone_count", 4)

        // Get total messages synced from database
        val smsRepository = SmsRepository(applicationContext)
        val messagesSynced = smsRepository.getTotalSyncedCount()

        // Get app version
        val appVersion = try {
            packageManager.getPackageInfo(packageName, 0).versionName
        } catch (e: Exception) {
            "1.0.0"
        }

        val request = SyncHeartbeatRequest(
            deviceName = deviceName,
            deviceId = deviceId,
            phoneCount = phoneCount,
            messagesSynced = messagesSynced,
            appVersion = appVersion,
            timestamp = System.currentTimeMillis()
        )

        try {
            val response = RetrofitClient.apiService.sendSyncHeartbeat(
                authToken = "Bearer $authToken",
                request = request
            )

            if (response.isSuccessful) {
                // Heartbeat sent successfully
                sharedPrefs.edit()
                    .putLong("last_heartbeat", System.currentTimeMillis())
                    .apply()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotification(): android.app.Notification {
        val channelId = "sync_heartbeat_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "Sync Heartbeat",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains sync status with Aurex dashboard"
            }

            val notificationManager = getSystemService(android.app.NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("Aurex Sync Active")
            .setContentText("Syncing SMS messages with dashboard")
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        heartbeatJob?.cancel()
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
