package com.aurex.android.receivers

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.SmsMessage
import com.aurex.android.models.SmsSyncRequest
import com.aurex.android.repository.SmsRepository
import com.aurex.android.utils.EncryptionUtils
import com.aurex.android.utils.SecureLogger
import java.text.SimpleDateFormat
import java.util.*
import kotlin.math.min
import kotlin.math.pow

class SmsSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SmsSyncWorker"
        private const val MAX_RETRY_ATTEMPTS = 5
        private const val BASE_BACKOFF_MS = 1000L // 1 second
        private const val MAX_BACKOFF_MS = 300000L // 5 minutes
    }

    private val smsRepository = SmsRepository(applicationContext)
    private val secureLogger = SecureLogger(applicationContext)

    override suspend fun doWork(): Result {
        val smsId = inputData.getLong("sms_id", -1L)
        val userId = inputData.getString("user_id") ?: return Result.failure()
        val authToken = inputData.getString("auth_token") ?: return Result.failure()

        if (smsId == -1L) {
            Log.e(TAG, "Invalid SMS ID")
            secureLogger.logError("Invalid SMS ID in sync worker")
            return Result.failure()
        }

        // Check network connectivity
        if (!isNetworkAvailable()) {
            Log.w(TAG, "No network connection, will retry later")
            secureLogger.logWarning("No network - queueing SMS $smsId for later sync")

            // Calculate exponential backoff for next retry
            val smsEntity = smsRepository.getSmsById(smsId)
            if (smsEntity != null) {
                val nextRetryDelay = calculateExponentialBackoff(smsEntity.syncAttempts)
                smsRepository.updateSyncStatus(
                    id = smsId,
                    status = "pending",
                    attempts = smsEntity.syncAttempts + 1,
                    nextRetryAt = System.currentTimeMillis() + nextRetryDelay,
                    errorMessage = "No network connection - queued for retry"
                )
            }
            return Result.retry()
        }

        return try {
            // Retrieve SMS from local database
            val smsEntity = smsRepository.getSmsById(smsId)
            if (smsEntity == null) {
                Log.e(TAG, "SMS not found in local database: $smsId")
                secureLogger.logError("SMS $smsId not found in database")
                return Result.failure()
            }

            // Skip if already synced
            if (smsEntity.synced && smsEntity.syncStatus == "synced") {
                Log.d(TAG, "SMS already synced: $smsId")
                return Result.success()
            }

            // Check if max retries exceeded
            if (smsEntity.syncAttempts >= MAX_RETRY_ATTEMPTS) {
                Log.e(TAG, "Max retry attempts exceeded for SMS: $smsId")
                smsRepository.updateSyncStatus(
                    id = smsId,
                    status = "failed",
                    attempts = smsEntity.syncAttempts,
                    errorMessage = "Max retries ($MAX_RETRY_ATTEMPTS) exceeded - manual sync required"
                )
                secureLogger.logError("SMS $smsId failed after $MAX_RETRY_ATTEMPTS attempts")
                return Result.failure()
            }

            // Verify content integrity (tamper detection)
            if (smsEntity.contentHash != null) {
                val decryptedContent = try {
                    if (smsEntity.isEncrypted) {
                        EncryptionUtils.decryptSmsContent(smsEntity.content)
                    } else {
                        smsEntity.content
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Decryption failed for SMS: $smsId", e)
                    smsRepository.markAsTampered(smsId)
                    secureLogger.logError("Decryption failed for SMS $smsId - possible tampering")
                    return Result.failure()
                }

                if (!EncryptionUtils.verifyContentIntegrity(decryptedContent, smsEntity.contentHash)) {
                    Log.e(TAG, "Content integrity check failed - tamper detected: $smsId")
                    smsRepository.markAsTampered(smsId)
                    secureLogger.logError("Tamper detected for SMS $smsId")
                    return Result.failure()
                }
            }

            // Check for conflicts (duplicate detection)
            val existingDuplicate = smsRepository.findDuplicateByFingerprint(smsEntity.messageFingerprint, smsId)
            if (existingDuplicate != null && existingDuplicate.synced) {
                Log.w(TAG, "Duplicate SMS detected: $smsId (duplicate of ${existingDuplicate.id})")
                smsRepository.updateSyncStatus(
                    id = smsId,
                    status = "conflict",
                    attempts = smsEntity.syncAttempts,
                    conflictDetected = true,
                    errorMessage = "Duplicate SMS detected - conflict resolution needed"
                )
                secureLogger.logWarning("Duplicate detected: SMS $smsId matches ${existingDuplicate.id}")
                return Result.success() // Don't retry, needs manual resolution
            }

            // Update status to "retrying"
            smsRepository.updateSyncStatus(
                id = smsId,
                status = "retrying",
                attempts = smsEntity.syncAttempts + 1
            )

            // Decrypt content for syncing
            val decryptedContent = if (smsEntity.isEncrypted) {
                EncryptionUtils.decryptSmsContent(smsEntity.content)
            } else {
                smsEntity.content
            }

            // Format timestamp for API
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")
            val receivedAt = dateFormat.format(Date(smsEntity.receivedAt))

            // Create API message object with all metadata
            val smsMessage = SmsMessage(
                id = smsEntity.serverId,
                userId = smsEntity.userId,
                semiAccountId = smsEntity.semiAccountId,
                phoneNumber = smsEntity.phoneNumber,
                sender = smsEntity.sender,
                content = decryptedContent, // Send decrypted content (server will re-encrypt)
                receivedAt = receivedAt,
                processed = smsEntity.processed
            )

            // Sync to server
            val request = SmsSyncRequest(listOf(smsMessage))
            val response = RetrofitClient.apiService.syncSms("Bearer $authToken", request)

            if (response.isSuccessful && response.body()?.success == true) {
                // Mark as synced in local database
                val serverId = response.body()?.serverIds?.firstOrNull() ?: generateServerId(smsEntity)
                smsRepository.markAsSynced(smsId, serverId)

                Log.d(TAG, "SMS synced successfully: $smsId -> $serverId")
                secureLogger.logInfo("SMS $smsId synced successfully after ${smsEntity.syncAttempts + 1} attempts")
                Result.success()
            } else {
                val errorMessage = response.body()?.message ?: "Unknown server error"
                Log.e(TAG, "SMS sync failed: $errorMessage")

                // Calculate next retry with exponential backoff
                val nextRetryDelay = calculateExponentialBackoff(smsEntity.syncAttempts + 1)
                smsRepository.updateSyncStatus(
                    id = smsId,
                    status = if (smsEntity.syncAttempts + 1 < MAX_RETRY_ATTEMPTS) "retrying" else "failed",
                    attempts = smsEntity.syncAttempts + 1,
                    nextRetryAt = System.currentTimeMillis() + nextRetryDelay,
                    errorMessage = errorMessage
                )

                secureLogger.logWarning("SMS $smsId sync failed (attempt ${smsEntity.syncAttempts + 1}): $errorMessage")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "SMS sync error", e)

            val smsEntity = smsRepository.getSmsById(smsId)
            if (smsEntity != null) {
                val nextRetryDelay = calculateExponentialBackoff(smsEntity.syncAttempts + 1)
                smsRepository.updateSyncStatus(
                    id = smsId,
                    status = "retrying",
                    attempts = smsEntity.syncAttempts + 1,
                    nextRetryAt = System.currentTimeMillis() + nextRetryDelay,
                    errorMessage = "Network error: ${e.message}"
                )
            }

            secureLogger.logError("SMS $smsId sync exception: ${e.message}", e)
            Result.retry()
        }
    }

    /**
     * Calculates exponential backoff delay with jitter
     * Formula: min(BASE * 2^attempts + jitter, MAX)
     */
    private fun calculateExponentialBackoff(attempts: Int): Long {
        val exponentialDelay = (BASE_BACKOFF_MS * 2.0.pow(attempts.toDouble())).toLong()
        val jitter = (Math.random() * BASE_BACKOFF_MS).toLong() // Add randomness
        return min(exponentialDelay + jitter, MAX_BACKOFF_MS)
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun generateServerId(smsEntity: com.aurex.android.database.SmsEntity): String {
        // Generate a temporary server ID (should be replaced with actual server response)
        return "${smsEntity.userId}_${smsEntity.receivedAt}_${smsEntity.sender.hashCode()}"
    }
}
