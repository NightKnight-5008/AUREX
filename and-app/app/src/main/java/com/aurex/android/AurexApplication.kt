package com.aurex.android

import android.app.Application
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.aurex.android.database.AurexDatabase
import com.aurex.android.observability.ObservabilityManager
import com.aurex.android.receivers.PeriodicSmsSyncWorker
import com.aurex.android.repository.SmsRepository
import com.aurex.android.utils.PreferenceManager
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber
import java.util.concurrent.TimeUnit

/**
 * AUREX Application Class
 * - Hilt DI enabled via @HiltAndroidApp
 * - Initializes observability system (Timber + Crashlytics)
 * - Schedules background SMS sync
 */
@HiltAndroidApp
class AurexApplication : Application() {

    companion object {
        private const val TAG = "AurexApplication"
        private const val PERIODIC_SYNC_WORK_NAME = "aurex_periodic_sms_sync"

        lateinit var instance: AurexApplication
            private set

        lateinit var preferenceManager: PreferenceManager
            private set

        lateinit var smsRepository: SmsRepository
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        // ✅ Initialize Observability System (Timber + Firebase Crashlytics)
        ObservabilityManager.init(this)
        Timber.i("AUREX Application starting...")

        preferenceManager = PreferenceManager(this)

        // Initialize database
        val database = AurexDatabase.getDatabase(this)
        smsRepository = SmsRepository(this)

        // Set user context for observability if logged in
        val userId = preferenceManager.getUserId()
        if (userId != null) {
            ObservabilityManager.setUserId(userId)
            Timber.i("User context set: $userId")
        }

        // Schedule periodic sync if user is logged in
        schedulePeriodicSyncIfNeeded()

        Timber.i("AUREX Application initialized successfully")
    }

    private fun schedulePeriodicSyncIfNeeded() {
        val userId = preferenceManager.getUserId()
        val authToken = preferenceManager.getAuthToken()

        if (userId != null && authToken != null) {
            schedulePeriodicSync()
        } else {
            Log.d(TAG, "User not logged in, skipping periodic sync setup")
        }
    }

    fun schedulePeriodicSync() {
        // Schedule periodic sync every 15 minutes
        val periodicSyncRequest = PeriodicWorkRequestBuilder<PeriodicSmsSyncWorker>(
            15, TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            PERIODIC_SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            periodicSyncRequest
        )

        Log.d(TAG, "Periodic SMS sync scheduled")
    }

    fun cancelPeriodicSync() {
        WorkManager.getInstance(this).cancelUniqueWork(PERIODIC_SYNC_WORK_NAME)
        Log.d(TAG, "Periodic SMS sync cancelled")
    }
}
