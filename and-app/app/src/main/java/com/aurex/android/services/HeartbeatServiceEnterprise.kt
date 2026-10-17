package com.aurex.android.services

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.*
import androidx.core.app.NotificationCompat
import com.aurex.android.BuildConfig
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.HeartbeatRequest
import com.aurex.android.repository.SmsRepository
import com.aurex.android.utils.PreferenceManager
import com.aurex.android.utils.SecureLogger
import kotlinx.coroutines.*

/**
 * Enterprise Heartbeat Service
 *
 * Sends device health monitoring data every 5 minutes:
 * - Battery level & status
 * - Network connectivity status
 * - Last SMS forwarded timestamp
 * - Local queue size (pending SMS)
 * - App version & Android version
 *
 * Enables desktop-side monitoring of SMS ingestion health.
 */
class HeartbeatServiceEnterprise : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null

    private lateinit var preferenceManager: PreferenceManager
    private lateinit var secureLogger: SecureLogger
    private lateinit var smsRepository: SmsRepository

    companion object {
        private const val TAG = "HeartbeatServiceEnterprise"
        private const val HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000L // 5 minutes (NON-NEGOTIABLE)
        private const val NOTIFICATION_ID = 3001

        fun start(context: Context) {
            val intent = Intent(context, HeartbeatServiceEnterprise::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, HeartbeatServiceEnterprise::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()

        preferenceManager = PreferenceManager(this)
        secureLogger = SecureLogger(this)
        smsRepository = SmsRepository(this)

        startForeground(NOTIFICATION_ID, createNotification())
        startHeartbeatLoop()

        secureLogger.logInfo("Heartbeat service started - monitoring every ${HEARTBEAT_INTERVAL_MS / 1000}s")
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
                    secureLogger.logError("Heartbeat send failed", e)
                }
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    private suspend fun sendHeartbeat() {
        // Check workspace binding
        if (!preferenceManager.isWorkspaceBound()) {
            secureLogger.logWarning("Device not bound to workspace - skipping heartbeat")
            return
        }

        val workspaceId = preferenceManager.getWorkspaceId()!!
        val deviceId = preferenceManager.getDeviceId()!!
        val deviceToken = preferenceManager.getDeviceToken()!!

        // STEP 1: Get battery level & status
        val batteryStatus = getBatteryStatus()

        // STEP 2: Get network status
        val networkStatus = getNetworkStatus()

        // STEP 3: Get last SMS forwarded timestamp
        val lastSmsForwardedAt = preferenceManager.getLastSmsForwardedAt()

        // STEP 4: Get local queue size (pending SMS)
        val localQueueSize = smsRepository.getUnsyncedCount()

        // STEP 5: Get app & Android version
        val appVersion = BuildConfig.VERSION_NAME
        val androidVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"

        // STEP 6: Build heartbeat payload
        val request = HeartbeatRequest(
            workspaceId = workspaceId,
            deviceId = deviceId,
            batteryLevel = batteryStatus.level,
            batteryCharging = batteryStatus.isCharging,
            networkStatus = networkStatus,
            lastSmsForwardedAt = lastSmsForwardedAt,
            localQueueSize = localQueueSize,
            appVersion = appVersion,
            androidVersion = androidVersion,
            timestamp = System.currentTimeMillis()
        )

        try {
            val response = RetrofitClient.apiService.sendHeartbeat(
                authToken = "Bearer $deviceToken",
                request = request
            )

            if (response.isSuccessful) {
                preferenceManager.saveLastHeartbeat(System.currentTimeMillis())
                secureLogger.logInfo("Heartbeat sent: queue=$localQueueSize, battery=${batteryStatus.level}%, network=$networkStatus")

                // ✅ NEW: Sync device configuration from server (if provided)
                val heartbeatBody = response.body()
                if (heartbeatBody?.deviceConfig != null) {
                    syncDeviceConfig(heartbeatBody.deviceConfig)
                }
            } else {
                secureLogger.logWarning("Heartbeat failed: ${response.code()}")
            }
        } catch (e: Exception) {
            secureLogger.logError("Heartbeat network error", e)
        }
    }

    /**
     * ✅ NEW: Sync device configuration from desktop → Android
     * Updates local preferences when desktop changes device priority
     */
    private fun syncDeviceConfig(config: com.aurex.android.models.DeviceConfigResponse) {
        val deviceId = preferenceManager.getDeviceId() ?: return

        // Get current device priority
        val currentPriority = preferenceManager.getDevicePriority(deviceId)
        val newPriority = config.devicePriority

        // Update priority if changed
        if (currentPriority != newPriority) {
            preferenceManager.setDevicePriority(deviceId, newPriority)
            secureLogger.logInfo("Device priority synced: $currentPriority → $newPriority")

            // Log observability event
            try {
                com.aurex.android.observability.ObservabilityManager.logEvent(
                    "device_priority_synced",
                    mapOf(
                        "old_priority" to currentPriority.toString(),
                        "new_priority" to newPriority.toString(),
                        "device_id" to deviceId
                    )
                )
            } catch (e: Exception) {
                // Ignore observability errors
            }

            // Broadcast config update to UI
            val broadcastIntent = Intent("com.aurex.android.DEVICE_CONFIG_UPDATED")
            broadcastIntent.putExtra("device_priority", newPriority)
            sendBroadcast(broadcastIntent)
        }

        // Update enabled state if provided
        val currentEnabled = preferenceManager.getDeviceEnabled(deviceId)
        if (currentEnabled != config.enabled) {
            preferenceManager.setDeviceEnabled(deviceId, config.enabled)
            secureLogger.logInfo("Device enabled state synced: $currentEnabled → ${config.enabled}")

            // Broadcast enabled state change
            val broadcastIntent = Intent("com.aurex.android.DEVICE_CONFIG_UPDATED")
            broadcastIntent.putExtra("device_enabled", config.enabled)
            sendBroadcast(broadcastIntent)
        }

        // Update sync interval override if provided
        if (config.syncIntervalMinutes != null) {
            val currentInterval = preferenceManager.getSyncIntervalMinutes()
            if (currentInterval != config.syncIntervalMinutes) {
                preferenceManager.setSyncIntervalMinutes(config.syncIntervalMinutes)
                secureLogger.logInfo("Sync interval updated: $currentInterval → ${config.syncIntervalMinutes} minutes")
            }
        }
    }

    /**
     * Gets battery status (level & charging state)
     */
    private fun getBatteryStatus(): BatteryStatus {
        val batteryIntent = applicationContext.registerReceiver(
            null,
            IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        )

        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level >= 0 && scale > 0) {
            (level.toFloat() / scale.toFloat() * 100).toInt()
        } else {
            -1
        }

        val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                         status == BatteryManager.BATTERY_STATUS_FULL

        return BatteryStatus(batteryPct, isCharging)
    }

    /**
     * Gets network connectivity status
     */
    private fun getNetworkStatus(): String {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork

        if (network == null) {
            return "disconnected"
        }

        val capabilities = connectivityManager.getNetworkCapabilities(network)
        if (capabilities == null) {
            return "unknown"
        }

        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            else -> "other"
        }
    }

    private fun createNotification(): android.app.Notification {
        val channelId = "heartbeat_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "Device Health Monitoring",
                android.app.NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains connection status with AUREX dashboard"
            }

            val notificationManager = getSystemService(android.app.NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("AUREX SMS Ingestion Active")
            .setContentText("Device health monitoring enabled")
            .setSmallIcon(android.R.drawable.stat_sys_upload_done)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        heartbeatJob?.cancel()
        serviceScope.cancel()
        secureLogger.logInfo("Heartbeat service stopped")
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private data class BatteryStatus(val level: Int, val isCharging: Boolean)
}
