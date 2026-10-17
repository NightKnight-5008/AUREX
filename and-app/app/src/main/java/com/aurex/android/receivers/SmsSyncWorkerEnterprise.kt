package com.aurex.android.receivers

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.SmsSyncRequestEnterprise
import com.aurex.android.repository.SmsRepository
import com.aurex.android.utils.EncryptionUtils
import com.aurex.android.utils.SecureLogger
import kotlin.math.min
import kotlin.math.pow

/**
 * Enterprise SMS Sync Worker
 *
 * Guaranteed delivery with:
 * - Exponential backoff (5s base, formula: 5 × 2^attempt)
 * - Max 5 retry attempts
 * - Network resilience
 * - Idempotency via sms_hash
 * - Device token authentication
 *
 * NO silent data loss.
 */
class SmsSyncWorkerEnterprise(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SmsSyncWorkerEnterprise"
        private const val MAX_RETRY_ATTEMPTS = 5
        private const val BASE_BACKOFF_SEC = 5L // 5 seconds (NON-NEGOTIABLE)
        private const val MAX_BACKOFF_SEC = 300L // 5 minutes
    }

    private val smsRepository = SmsRepository(applicationContext)
    private val secureLogger = SecureLogger(applicationContext)

    override suspend fun doWork(): Result {
        val smsId = inputData.getLong("sms_id", -1L)
        val workspaceId = inputData.getString("workspace_id") ?: return Result.failure()
        val deviceId = inputData.getString("device_id") ?: return Result.failure()
        val deviceToken = inputData.getString("device_token") ?: return Result.failure()

        if (smsId == -1L) {
            Log.e(TAG, "Invalid SMS ID")
            secureLogger.logError("Invalid SMS ID in sync worker")
            return Result.failure()
        }

        // STEP 1: Check network connectivity
        if (!isNetworkAvailable()) {
            Log.w(TAG, "No network connection, will retry later")
            secureLogger.logWarning("No network - queueing SMS $smsId for later sync")

            val smsEntity = smsRepository.getSmsById(smsId)
            if (smsEntity != null) {
                val nextRetryDelay = calculateExponentialBackoff(smsEntity.syncAttempts)
                smsRepository.updateSyncStatus(
                    id = smsId,
                    status = "pending",
                    attempts = smsEntity.syncAttempts + 1,
                    nextRetryAt = System.currentTimeMillis() + (nextRetryDelay * 1000),
                    errorMessage = "No network connection - queued for retry"
                )
            }
            return Result.retry()
        }

        return try {
            // STEP 2: Retrieve SMS from local database
            val smsEntity = smsRepository.getSmsById(smsId)
            if (smsEntity == null) {
                Log.e(TAG, "SMS not found in local database: $smsId")
                secureLogger.logError("SMS $smsId not found in database")
                return Result.failure()
            }

            // STEP 3: Skip if already synced
            if (smsEntity.synced && smsEntity.syncStatus == "synced") {
                Log.d(TAG, "SMS already synced: $smsId")
                return Result.success()
            }

            // STEP 4: Check if max retries exceeded
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

            // STEP 5: Verify content integrity (tamper detection)
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

            // STEP 6: Update status to "retrying"
            smsRepository.updateSyncStatus(
                id = smsId,
                status = "retrying",
                attempts = smsEntity.syncAttempts + 1
            )

            // STEP 7: Decrypt content for syncing
            val decryptedContent = if (smsEntity.isEncrypted) {
                EncryptionUtils.decryptSmsContent(smsEntity.content)
            } else {
                smsEntity.content
            }

            val decryptedSender = if (smsEntity.encryptedMetadata) {
                try {
                    EncryptionUtils.decryptMetadata(smsEntity.sender)
                } catch (e: Exception) {
                    smsEntity.sender
                }
            } else {
                smsEntity.sender
            }

            // STEP 8: Create sync request payload with idempotency hash
            val request = SmsSyncRequestEnterprise(
                workspaceId = smsEntity.workspaceId,
                deviceId = smsEntity.deviceId,
                smsHash = smsEntity.smsHash,
                sender = decryptedSender,
                content = decryptedContent,
                receivedAtUtc = smsEntity.receivedAtUtc,
                deviceTimezoneOffset = smsEntity.deviceTimezoneOffset,
                deviceLocale = smsEntity.deviceLocale,
                phoneNumber = smsEntity.phoneNumber,
                likelyFinancial = smsEntity.likelyFinancial
            )

            // STEP 9: Sync to server with device token auth
            val response = RetrofitClient.apiService.syncSmsEnterprise(
                authToken = "Bearer $deviceToken",
                request = request
            )

            if (response.isSuccessful && response.body()?.success == true) {
                // Backend acknowledged - mark as synced
                val serverId = response.body()?.serverId ?: smsEntity.smsHash
                smsRepository.markAsSynced(smsId, serverId)

                Log.d(TAG, "SMS synced successfully: $smsId -> $serverId (hash: ${smsEntity.smsHash})")
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
                    nextRetryAt = System.currentTimeMillis() + (nextRetryDelay * 1000),
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
                    nextRetryAt = System.currentTimeMillis() + (nextRetryDelay * 1000),
                    errorMessage = "Network error: ${e.message}"
                )
            }

            secureLogger.logError("SMS $smsId sync exception: ${e.message}", e)
            Result.retry()
        }
    }

    /**
     * Calculates exponential backoff delay (Enterprise formula)
     *
     * Formula: BaseDelay × (2 ^ retry_attempt)
     * Where BaseDelay = 5 seconds
     *
     * Examples:
     * - Attempt 0: 5s
     * - Attempt 1: 10s
     * - Attempt 2: 20s
     * - Attempt 3: 40s
     * - Attempt 4: 80s
     * - Max: 300s (5 minutes)
     */
    private fun calculateExponentialBackoff(attempts: Int): Long {
        val exponentialDelay = (BASE_BACKOFF_SEC * 2.0.pow(attempts.toDouble())).toLong()
        return min(exponentialDelay, MAX_BACKOFF_SEC)
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
