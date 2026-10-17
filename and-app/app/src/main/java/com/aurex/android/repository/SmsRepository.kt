package com.aurex.android.repository

import android.content.Context
import android.util.Log
import com.aurex.android.database.AurexDatabase
import com.aurex.android.database.SmsEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SmsRepository(context: Context) {

    private val smsDao = AurexDatabase.getDatabase(context).smsDao()

    companion object {
        private const val TAG = "SmsRepository"
        private const val MAX_SYNC_ATTEMPTS = 5
        private const val OLD_SMS_RETENTION_DAYS = 30L
    }

    suspend fun insertSms(sms: SmsEntity): Long = withContext(Dispatchers.IO) {
        smsDao.insertSms(sms)
    }

    suspend fun getSmsById(id: Long): SmsEntity? = withContext(Dispatchers.IO) {
        smsDao.getSmsById(id)
    }

    suspend fun getUnsyncedSms(): List<SmsEntity> = withContext(Dispatchers.IO) {
        smsDao.getUnsyncedSms().filter { it.syncAttempts < MAX_SYNC_ATTEMPTS }
    }

    suspend fun getAllSms(): List<SmsEntity> = withContext(Dispatchers.IO) {
        smsDao.getAllSms()
    }

    suspend fun getSmsByUserId(userId: String): List<SmsEntity> = withContext(Dispatchers.IO) {
        smsDao.getSmsByUserId(userId)
    }

    suspend fun markAsSynced(id: Long, serverId: String) = withContext(Dispatchers.IO) {
        smsDao.markAsSynced(id, serverId, System.currentTimeMillis())
        Log.d(TAG, "SMS $id marked as synced with server ID: $serverId")
    }

    suspend fun incrementSyncAttempts(id: Long) = withContext(Dispatchers.IO) {
        val timestamp = System.currentTimeMillis()
        smsDao.incrementSyncAttempts(id, timestamp)
        Log.d(TAG, "Incremented sync attempts for SMS $id")
    }

    /**
     * Updates comprehensive sync status with all metadata
     */
    suspend fun updateSyncStatus(
        id: Long,
        status: String,
        attempts: Int,
        nextRetryAt: Long? = null,
        errorMessage: String? = null,
        conflictDetected: Boolean = false
    ) = withContext(Dispatchers.IO) {
        smsDao.updateSyncStatus(id, status, attempts, System.currentTimeMillis(), nextRetryAt, errorMessage, conflictDetected)
        Log.d(TAG, "Updated sync status for SMS $id: $status (attempts: $attempts)")
    }

    /**
     * Marks SMS as tampered (integrity check failed)
     */
    suspend fun markAsTampered(id: Long) = withContext(Dispatchers.IO) {
        smsDao.markAsTampered(id)
        Log.e(TAG, "SMS $id marked as tampered - integrity violation detected")
    }

    /**
     * Finds duplicate SMS by message fingerprint
     */
    suspend fun findDuplicateByFingerprint(fingerprint: String, excludeId: Long): SmsEntity? = withContext(Dispatchers.IO) {
        smsDao.findByFingerprint(fingerprint, excludeId)
    }

    /**
     * Gets SMS messages by sync status
     */
    suspend fun getSmsByStatus(status: String): List<SmsEntity> = withContext(Dispatchers.IO) {
        smsDao.getSmsByStatus(status)
    }

    /**
     * Gets failed SMS messages that need manual intervention
     */
    suspend fun getFailedSms(): List<SmsEntity> = withContext(Dispatchers.IO) {
        smsDao.getSmsByStatus("failed")
    }

    /**
     * Gets conflicted SMS messages
     */
    suspend fun getConflictedSms(): List<SmsEntity> = withContext(Dispatchers.IO) {
        smsDao.getConflictedSms()
    }

    /**
     * Gets SMS ready for retry (past nextRetryAt time)
     */
    suspend fun getSmsReadyForRetry(): List<SmsEntity> = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        smsDao.getSmsReadyForRetry(now)
    }

    /**
     * Resolves conflict by marking duplicate as handled
     */
    suspend fun resolveConflict(id: Long, keepOriginal: Boolean) = withContext(Dispatchers.IO) {
        if (keepOriginal) {
            // Mark duplicate as processed, don't sync
            smsDao.markAsProcessed(id)
        } else {
            // Allow duplicate to sync
            smsDao.updateSyncStatus(id, "pending", 0, System.currentTimeMillis(), null, null, false)
        }
        Log.d(TAG, "Resolved conflict for SMS $id (keep original: $keepOriginal)")
    }

    /**
     * Manually triggers sync for failed SMS
     */
    suspend fun retryFailedSync(id: Long) = withContext(Dispatchers.IO) {
        smsDao.updateSyncStatus(id, "pending", 0, System.currentTimeMillis(), null, null, false)
        Log.d(TAG, "Reset sync status for manual retry: SMS $id")
    }

    suspend fun getUnsyncedCount(): Int = withContext(Dispatchers.IO) {
        smsDao.getUnsyncedCount()
    }

    suspend fun getTotalCount(): Int = withContext(Dispatchers.IO) {
        smsDao.getTotalCount()
    }

    /**
     * Gets sync statistics for monitoring
     */
    suspend fun getSyncStats(): Map<String, Int> = withContext(Dispatchers.IO) {
        mapOf(
            "total" to smsDao.getTotalCount(),
            "synced" to smsDao.getSyncedCount(),
            "pending" to smsDao.getSmsByStatus("pending").size,
            "retrying" to smsDao.getSmsByStatus("retrying").size,
            "failed" to smsDao.getSmsByStatus("failed").size,
            "conflict" to smsDao.getConflictedSms().size
        )
    }

    suspend fun cleanupOldSyncedSms() = withContext(Dispatchers.IO) {
        val cutoffTimestamp = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(OLD_SMS_RETENTION_DAYS)
        smsDao.deleteOldSyncedSms(cutoffTimestamp)
        Log.d(TAG, "Cleaned up old synced SMS messages")
    }
}
