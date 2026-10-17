package com.aurex.android.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.aurex.android.R
import com.aurex.android.observability.ObservabilityManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * Foreground Service for SMS Sync - Android 12+ Compatibility
 * Phase 3 Implementation
 *
 * This service ensures SMS sync continues running on Android 12+ by using
 * a foreground service with a persistent notification.
 */
@AndroidEntryPoint
class SmsSyncForegroundService : Service() {

    @Inject
    lateinit var observabilityManager: ObservabilityManager

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var isRunning = false

    companion object {
        private const val NOTIFICATION_ID = 100
        private const val CHANNEL_ID = "sms_sync_channel"
        private const val CHANNEL_NAME = "SMS Sync Service"

        const val ACTION_START_SYNC = "com.aurex.android.START_SMS_SYNC"
        const val ACTION_STOP_SYNC = "com.aurex.android.STOP_SMS_SYNC"

        fun startService(context: Context) {
            val intent = Intent(context, SmsSyncForegroundService::class.java).apply {
                action = ACTION_START_SYNC
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, SmsSyncForegroundService::class.java).apply {
                action = ACTION_STOP_SYNC
            }
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Timber.i("SmsSyncForegroundService created")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Timber.i("SmsSyncForegroundService onStartCommand: action=${intent?.action}")

        when (intent?.action) {
            ACTION_START_SYNC -> {
                if (!isRunning) {
                    startForeground(NOTIFICATION_ID, createNotification("SMS Sync Active"))
                    isRunning = true
                    startSyncMonitoring()
                    observabilityManager.trackEvent("foreground_service_started", mapOf(
                        "service" to "sms_sync"
                    ))
                }
            }
            ACTION_STOP_SYNC -> {
                stopSyncMonitoring()
                stopSelf()
            }
        }

        return START_STICKY // Service will be restarted if killed
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null // Not a bound service
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.i("SmsSyncForegroundService destroyed")
        stopSyncMonitoring()
        isRunning = false
        observabilityManager.trackEvent("foreground_service_stopped", mapOf(
            "service" to "sms_sync"
        ))
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW // Low importance = no sound
            ).apply {
                description = "Keeps AUREX SMS sync running in the background"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(contentText: String): Notification {
        val stopIntent = Intent(this, SmsSyncForegroundService::class.java).apply {
            action = ACTION_STOP_SYNC
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AUREX SMS Sync")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_notification) // Placeholder - replace with actual icon
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true) // Cannot be dismissed
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop",
                stopPendingIntent
            )
            .build()
    }

    private fun updateNotification(contentText: String) {
        val notification = createNotification(contentText)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun startSyncMonitoring() {
        Timber.i("Starting SMS sync monitoring in foreground service")

        serviceScope.launch {
            try {
                // Monitor sync status and update notification
                // This is a placeholder - actual implementation would monitor WorkManager
                var syncCount = 0
                while (isRunning) {
                    kotlinx.coroutines.delay(60000) // Check every minute
                    syncCount++
                    updateNotification("Last sync check: ${syncCount}m ago")
                }
            } catch (e: Exception) {
                Timber.e(e, "Error in sync monitoring")
                observabilityManager.recordException(e, mapOf(
                    "context" to "foreground_service_monitoring"
                ))
            }
        }
    }

    private fun stopSyncMonitoring() {
        Timber.i("Stopping SMS sync monitoring")
        serviceScope.cancel()
    }
}
