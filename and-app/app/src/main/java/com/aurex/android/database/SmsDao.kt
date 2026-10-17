package com.aurex.android.database

import androidx.room.*

@Dao
interface SmsDao {

    @Query("SELECT * FROM sms_messages ORDER BY received_at DESC")
    suspend fun getAllSms(): List<SmsEntity>

    @Query("SELECT * FROM sms_messages WHERE synced = 0 ORDER BY received_at ASC")
    suspend fun getUnsyncedSms(): List<SmsEntity>

    @Query("SELECT * FROM sms_messages WHERE id = :id")
    suspend fun getSmsById(id: Long): SmsEntity?

    @Query("SELECT * FROM sms_messages WHERE user_id = :userId ORDER BY received_at DESC")
    suspend fun getSmsByUserId(userId: String): List<SmsEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSms(sms: SmsEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllSms(smsList: List<SmsEntity>)

    @Update
    suspend fun updateSms(sms: SmsEntity)

    @Delete
    suspend fun deleteSms(sms: SmsEntity)

    @Query("UPDATE sms_messages SET synced = 1, sync_status = 'synced', server_id = :serverId, last_sync_attempt = :syncedAt WHERE id = :id")
    suspend fun markAsSynced(id: Long, serverId: String, syncedAt: Long)

    @Query("UPDATE sms_messages SET sync_attempts = sync_attempts + 1, last_sync_attempt = :timestamp WHERE id = :id")
    suspend fun incrementSyncAttempts(id: Long, timestamp: Long)

    /**
     * Updates comprehensive sync status with all metadata
     */
    @Query("UPDATE sms_messages SET sync_status = :status, sync_attempts = :attempts, last_sync_attempt = :timestamp, next_retry_at = :nextRetryAt, sync_error_message = :errorMessage, conflict_detected = :conflictDetected WHERE id = :id")
    suspend fun updateSyncStatus(id: Long, status: String, attempts: Int, timestamp: Long, nextRetryAt: Long?, errorMessage: String?, conflictDetected: Boolean)

    /**
     * Marks SMS as tampered (integrity check failed)
     */
    @Query("UPDATE sms_messages SET tamper_detected = 1 WHERE id = :id")
    suspend fun markAsTampered(id: Long)

    /**
     * Finds duplicate SMS by message fingerprint
     */
    @Query("SELECT * FROM sms_messages WHERE message_fingerprint = :fingerprint AND id != :excludeId LIMIT 1")
    suspend fun findByFingerprint(fingerprint: String, excludeId: Long): SmsEntity?

    /**
     * Gets SMS messages by sync status
     */
    @Query("SELECT * FROM sms_messages WHERE sync_status = :status ORDER BY received_at DESC")
    suspend fun getSmsByStatus(status: String): List<SmsEntity>

    /**
     * Gets conflicted SMS messages
     */
    @Query("SELECT * FROM sms_messages WHERE conflict_detected = 1 ORDER BY received_at DESC")
    suspend fun getConflictedSms(): List<SmsEntity>

    /**
     * Gets SMS ready for retry (past nextRetryAt time)
     */
    @Query("SELECT * FROM sms_messages WHERE sync_status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= :now) ORDER BY received_at ASC")
    suspend fun getSmsReadyForRetry(now: Long): List<SmsEntity>

    /**
     * Marks SMS as processed by backend
     */
    @Query("UPDATE sms_messages SET processed = 1 WHERE id = :id")
    suspend fun markAsProcessed(id: Long)

    /**
     * Gets count of synced SMS
     */
    @Query("SELECT COUNT(*) FROM sms_messages WHERE synced = 1")
    suspend fun getSyncedCount(): Int

    @Query("DELETE FROM sms_messages WHERE synced = 1 AND received_at < :timestamp")
    suspend fun deleteOldSyncedSms(timestamp: Long)

    @Query("SELECT COUNT(*) FROM sms_messages WHERE synced = 0")
    suspend fun getUnsyncedCount(): Int

    @Query("SELECT COUNT(*) FROM sms_messages")
    suspend fun getTotalCount(): Int
}
