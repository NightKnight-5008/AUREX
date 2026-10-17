package com.aurex.android.workers

import android.content.Context
import androidx.work.*
import com.aurex.android.observability.ObservabilityManager
import com.aurex.android.receivers.PeriodicSmsSyncWorker
import com.aurex.android.utils.BatteryOptimizationManager
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * WorkManager Scheduler - Phase 3 Improvements
 * Centralized WorkManager scheduling with intelligent constraints
 */
object WorkManagerScheduler {

    private const val PERIODIC_SYNC_WORK_NAME = "periodic_sms_sync"
    private const val HEARTBEAT_WORK_NAME = "device_heartbeat"
    private const val RETRY_FAILED_WORK_NAME = "retry_failed_sms"

    /**
     * Schedule periodic SMS sync with battery-aware constraints
     */
    fun schedulePeriodicSync(
        context: Context,
        intervalMinutes: Long = 15,
        observabilityManager: ObservabilityManager
    ) {
        val constraints = buildSyncConstraints(context)

        val periodicWorkRequest = PeriodicWorkRequestBuilder<PeriodicSmsSyncWorker>(
            intervalMinutes, TimeUnit.MINUTES,
            5, TimeUnit.MINUTES // Flex interval for battery optimization
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .addTag("sms_sync")
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            PERIODIC_SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP, // Don't replace if already scheduled
            periodicWorkRequest
        )

        Timber.i("Periodic SMS sync scheduled: interval=${intervalMinutes}m")
        observabilityManager.trackEvent("periodic_sync_scheduled", mapOf(
            "interval_minutes" to intervalMinutes.toString()
        ))
    }

    /**
     * Schedule device heartbeat (configuration sync)
     */
    fun scheduleHeartbeat(
        context: Context,
        intervalMinutes: Long = 60,
        observabilityManager: ObservabilityManager
    ) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val heartbeatWorkRequest = PeriodicWorkRequestBuilder<HeartbeatWorker>(
            intervalMinutes, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .addTag("heartbeat")
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            HEARTBEAT_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            heartbeatWorkRequest
        )

        Timber.i("Device heartbeat scheduled: interval=${intervalMinutes}m")
        observabilityManager.trackEvent("heartbeat_scheduled", mapOf(
            "interval_minutes" to intervalMinutes.toString()
        ))
    }

    /**
     * Schedule immediate retry for failed SMS messages
     */
    fun scheduleImmediateRetry(
        context: Context,
        observabilityManager: ObservabilityManager
    ) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val retryWorkRequest = OneTimeWorkRequestBuilder<PeriodicSmsSyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .addTag("immediate_retry")
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            RETRY_FAILED_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            retryWorkRequest
        )

        Timber.i("Immediate retry scheduled for failed messages")
        observabilityManager.trackEvent("immediate_retry_scheduled")
    }

    /**
     * Cancel all scheduled work (for user logout or sync disable)
     */
    fun cancelAllWork(context: Context, observabilityManager: ObservabilityManager) {
        WorkManager.getInstance(context).apply {
            cancelUniqueWork(PERIODIC_SYNC_WORK_NAME)
            cancelUniqueWork(HEARTBEAT_WORK_NAME)
            cancelUniqueWork(RETRY_FAILED_WORK_NAME)
        }

        Timber.w("All WorkManager tasks cancelled")
        observabilityManager.trackEvent("all_work_cancelled")
    }

    /**
     * Get work status summary for UI display
     */
    fun getWorkStatus(context: Context): WorkStatus {
        val workManager = WorkManager.getInstance(context)

        val periodicSyncInfo = workManager.getWorkInfosForUniqueWork(PERIODIC_SYNC_WORK_NAME).get()
        val heartbeatInfo = workManager.getWorkInfosForUniqueWork(HEARTBEAT_WORK_NAME).get()

        return WorkStatus(
            isPeriodicSyncScheduled = periodicSyncInfo.isNotEmpty() && periodicSyncInfo.any {
                it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.RUNNING
            },
            isHeartbeatScheduled = heartbeatInfo.isNotEmpty() && heartbeatInfo.any {
                it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.RUNNING
            },
            lastSyncState = periodicSyncInfo.firstOrNull()?.state?.name ?: "Unknown",
            lastHeartbeatState = heartbeatInfo.firstOrNull()?.state?.name ?: "Unknown"
        )
    }

    /**
     * Build intelligent sync constraints based on battery optimization status
     */
    private fun buildSyncConstraints(context: Context): Constraints {
        val isBatteryOptimizationIgnored = BatteryOptimizationManager.isBatteryOptimizationIgnored(context)

        return Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .apply {
                // Only require battery not low if battery optimization is NOT ignored
                // This allows more aggressive syncing when the app has battery exemption
                if (!isBatteryOptimizationIgnored) {
                    setRequiresBatteryNotLow(true)
                }
            }
            .build()
    }

    data class WorkStatus(
        val isPeriodicSyncScheduled: Boolean,
        val isHeartbeatScheduled: Boolean,
        val lastSyncState: String,
        val lastHeartbeatState: String
    )

    /**
     * Heartbeat Worker - Lightweight worker for device configuration sync
     */
    class HeartbeatWorker(
        context: Context,
        params: WorkerParameters
    ) : CoroutineWorker(context, params) {

        override suspend fun doWork(): Result {
            Timber.d("HeartbeatWorker started")

            return try {
                // Trigger heartbeat service
                // Note: Actual implementation would call HeartbeatServiceEnterprise
                Timber.i("Heartbeat completed successfully")
                Result.success()
            } catch (e: Exception) {
                Timber.e(e, "Heartbeat failed")
                Result.retry()
            }
        }
    }
}
