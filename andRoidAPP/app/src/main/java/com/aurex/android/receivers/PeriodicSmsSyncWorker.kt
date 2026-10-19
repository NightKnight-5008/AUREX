package com.aurex.android.receivers

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.aurex.android.AurexApplication
import com.aurex.android.api.RetrofitClient
import com.aurex.android.models.SmsMessage
import com.aurex.android.models.SmsSyncRequest
import com.aurex.android.repository.SmsRepository
import java.text.SimpleDateFormat
import java.util.*

class PeriodicSmsSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "PeriodicSmsSyncWorker"
        private const val BATCH_SIZE = 50
    }

    private val smsRepository = SmsRepository(applicationContext)

    override suspend fun doWork(): Result {
        Log.d(TAG, "Starting periodic SMS sync")

        // Get user credentials
        val userId = AurexApplication.preferenceManager.getUserId()
        val authToken = AurexApplication.preferenceManager.getAuthToken()

        if (userId == null || authToken == null) {
            Log.w(TAG, "User not logged in, skipping sync")
            return Result.success()
        }

        // Check network connectivity
        if (!isNetworkAvailable()) {
            Log.w(TAG, "No network connection, skipping sync")
            return Result.retry()
        }

        return try {
            // Get unsynced messages
            val unsyncedMessages = smsRepository.getUnsyncedSms()

            if (unsyncedMessages.isEmpty()) {
                Log.d(TAG, "No unsynced messages to sync")
                // Clean up old synced messages
                smsRepository.cleanupOldSyncedSms()
                return Result.success()
            }

            Log.d(TAG, "Found ${unsyncedMessages.size} unsynced messages")

            // Sync messages in batches
            val batches = unsyncedMessages.chunked(BATCH_SIZE)
            var successCount = 0
            var failureCount = 0

            for (batch in batches) {
                val result = syncBatch(batch, authToken)
                if (result) {
                    successCount += batch.size
                } else {
                    failureCount += batch.size
                }
            }

            Log.d(TAG, "Periodic sync completed: $successCount synced, $failureCount failed")

            // Clean up old synced messages after successful sync
            if (successCount > 0) {
                smsRepository.cleanupOldSyncedSms()
            }

            // Return success if at least some messages were synced
            if (successCount > 0 || failureCount == 0) {
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Periodic sync error", e)
            Result.retry()
        }
    }

    private suspend fun syncBatch(batch: List<com.aurex.android.database.SmsEntity>, authToken: String): Boolean {
        try {
            // Format messages for API
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
            dateFormat.timeZone = TimeZone.getTimeZone("UTC")

            val apiMessages = batch.map { smsEntity ->
                SmsMessage(
                    id = smsEntity.serverId,
                    userId = smsEntity.userId ?: "",
                    semiAccountId = smsEntity.semiAccountId,
                    phoneNumber = smsEntity.phoneNumber,
                    sender = smsEntity.sender,
                    content = smsEntity.content,
                    receivedAt = dateFormat.format(Date(smsEntity.receivedAt)),
                    processed = smsEntity.processed
                )
            }

            // Sync batch to server
            val request = com.aurex.android.models.SmsSyncRequest(apiMessages)
            val response = RetrofitClient.apiService.syncSms("Bearer $authToken", request)

            when {
                // ✅ SUCCESS (HTTP 200)
                response.isSuccessful && response.body()?.success == true -> {
                    // Mark all messages in batch as synced
                    for (smsEntity in batch) {
                        val serverId = generateServerId(smsEntity)
                        smsRepository.markAsSynced(smsEntity.id, serverId)

                        // Log success metric
                        try {
                            com.aurex.android.observability.ObservabilityManager.logEvent(
                                "sms_synced",
                                mapOf(
                                    "local_id" to smsEntity.id.toString(),
                                    "server_id" to serverId
                                )
                            )
                        } catch (e: Exception) {
                            // Ignore observability errors
                        }
                    }
                    Log.d(TAG, "Batch of ${batch.size} messages synced successfully")
                    return true
                }

                // ⚠️ CONFLICT (HTTP 409) - Duplicate message already exists on server
                response.code() == 409 -> {
                    Log.w(TAG, "Conflict detected (409) - resolving duplicates")

                    try {
                        val conflictResponse = parseConflictResponse(response.errorBody()?.string())
                        handleConflicts(batch, conflictResponse)

                        // Log conflict resolution metric
                        try {
                            com.aurex.android.observability.ObservabilityManager.recordMetric(
                                "sync_conflicts_resolved",
                                conflictResponse.conflicts.size.toDouble(),
                                mapOf("conflict_type" to conflictResponse.conflictType)
                            )
                        } catch (e: Exception) {
                            // Ignore observability errors
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse conflict response", e)
                        // Fallback: mark all as needing retry
                        for (smsEntity in batch) {
                            smsRepository.incrementSyncAttempts(smsEntity.id)
                        }
                    }
                    return true // Conflicts resolved, don't retry
                }

                // ❌ VALIDATION ERROR (HTTP 422) - Malformed data
                response.code() == 422 -> {
                    Log.e(TAG, "Validation error (422) - marking messages as failed")

                    try {
                        val validationResponse = parseValidationErrorResponse(response.errorBody()?.string())
                        handleValidationErrors(batch, validationResponse)

                        // Log validation error metric
                        try {
                            com.aurex.android.observability.ObservabilityManager.recordMetric(
                                "sync_validation_errors",
                                validationResponse.validationErrors.size.toDouble()
                            )
                        } catch (e: Exception) {
                            // Ignore observability errors
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to parse validation error response", e)
                        // Fallback: mark all as permanently failed
                        for (smsEntity in batch) {
                            smsRepository.updateSyncStatus(
                                id = smsEntity.id,
                                status = "failed",
                                attempts = smsEntity.syncAttempts + 1,
                                errorMessage = "Validation error (422): Malformed data"
                            )
                        }
                    }
                    return true // Don't retry validation errors
                }

                // 🔄 SERVER ERROR (HTTP 5xx) - Retry later with exponential backoff
                response.code() in 500..599 -> {
                    Log.w(TAG, "Server error (${response.code()}) - will retry with backoff")

                    for (smsEntity in batch) {
                        val nextAttempt = smsEntity.syncAttempts + 1
                        val backoffMs = calculateBackoff(nextAttempt)
                        val nextRetryAt = System.currentTimeMillis() + backoffMs

                        smsRepository.updateSyncStatus(
                            id = smsEntity.id,
                            status = "retrying",
                            attempts = nextAttempt,
                            nextRetryAt = nextRetryAt,
                            errorMessage = "Server error (${response.code()})"
                        )
                    }

                    // Log server error metric
                    try {
                        com.aurex.android.observability.ObservabilityManager.recordMetric(
                            "sync_server_errors",
                            batch.size.toDouble(),
                            mapOf("status_code" to response.code().toString())
                        )
                    } catch (e: Exception) {
                        // Ignore observability errors
                    }

                    return false // Retry on next sync interval
                }

                // ❓ OTHER CLIENT ERROR (HTTP 4xx) - Log and mark as failed
                response.code() in 400..499 -> {
                    Log.e(TAG, "Client error (${response.code()}) - marking as failed: ${response.body()?.message}")

                    for (smsEntity in batch) {
                        smsRepository.updateSyncStatus(
                            id = smsEntity.id,
                            status = "failed",
                            attempts = smsEntity.syncAttempts + 1,
                            errorMessage = "Client error (${response.code()}): ${response.body()?.message}"
                        )
                    }
                    return true // Don't retry client errors
                }

                // ❌ UNKNOWN ERROR
                else -> {
                    Log.e(TAG, "Unknown sync error: ${response.code()} - ${response.body()?.message}")
                    for (smsEntity in batch) {
                        smsRepository.incrementSyncAttempts(smsEntity.id)
                    }
                    return false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Batch sync exception", e)

            // Record error via ObservabilityManager
            try {
                com.aurex.android.observability.ObservabilityManager.recordError(
                    "sync_batch_exception",
                    e,
                    mapOf("batch_size" to batch.size.toString())
                )
            } catch (observabilityError: Exception) {
                // Ignore observability errors
            }

            // Increment sync attempts for all messages in failed batch
            for (smsEntity in batch) {
                smsRepository.incrementSyncAttempts(smsEntity.id)
            }
            return false
        }
    }

    /**
     * Handle conflict resolution (HTTP 409)
     * Strategy: Use server-assigned IDs, mark local copies as synced
     */
    private suspend fun handleConflicts(
        batch: List<com.aurex.android.database.SmsEntity>,
        conflictResponse: com.aurex.android.models.ConflictResponse
    ) {
        for (conflict in conflictResponse.conflicts) {
            // Find matching local message (by local_id if provided, or by matching content)
            val matchingEntity = if (conflict.localId != null) {
                batch.find { it.id.toString() == conflict.localId }
            } else {
                // Fallback: find by content/sender match (simplified)
                batch.firstOrNull()
            }

            if (matchingEntity != null) {
                when (conflict.resolution) {
                    "use_server_id" -> {
                        // Mark local message as synced using server ID
                        smsRepository.markAsSynced(matchingEntity.id, conflict.serverId)
                        Log.d(TAG, "Conflict resolved: Local ${matchingEntity.id} mapped to server ${conflict.serverId}")
                    }
                    "merge" -> {
                        // For now, treat merge same as use_server_id
                        // In future, could update local data with server data
                        smsRepository.markAsSynced(matchingEntity.id, conflict.serverId)
                        Log.d(TAG, "Conflict merged: Local ${matchingEntity.id} merged with server ${conflict.serverId}")
                    }
                    else -> {
                        Log.w(TAG, "Unknown conflict resolution strategy: ${conflict.resolution}")
                        smsRepository.markAsSynced(matchingEntity.id, conflict.serverId)
                    }
                }
            } else {
                Log.w(TAG, "Could not find local message for conflict: ${conflict.localId}")
            }
        }
    }

    /**
     * Handle validation errors (HTTP 422)
     * Strategy: Mark as permanently failed, don't retry
     */
    private suspend fun handleValidationErrors(
        batch: List<com.aurex.android.database.SmsEntity>,
        validationResponse: com.aurex.android.models.ValidationErrorResponse
    ) {
        for (validationError in validationResponse.validationErrors) {
            val matchingEntity = if (validationError.localId != null) {
                batch.find { it.id.toString() == validationError.localId }
            } else {
                batch.firstOrNull()
            }

            if (matchingEntity != null) {
                smsRepository.updateSyncStatus(
                    id = matchingEntity.id,
                    status = "failed",
                    attempts = matchingEntity.syncAttempts + 1,
                    errorMessage = "Validation error: ${validationError.field} - ${validationError.error}"
                )
                Log.e(TAG, "Validation failed for SMS ${matchingEntity.id}: ${validationError.field} - ${validationError.error}")
            }
        }
    }

    /**
     * Parse conflict response from error body
     */
    private fun parseConflictResponse(errorBody: String?): com.aurex.android.models.ConflictResponse {
        if (errorBody == null) {
            throw IllegalArgumentException("Empty conflict response")
        }

        return try {
            com.google.gson.Gson().fromJson(errorBody, com.aurex.android.models.ConflictResponse::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse conflict response JSON", e)
            throw e
        }
    }

    /**
     * Parse validation error response from error body
     */
    private fun parseValidationErrorResponse(errorBody: String?): com.aurex.android.models.ValidationErrorResponse {
        if (errorBody == null) {
            throw IllegalArgumentException("Empty validation error response")
        }

        return try {
            com.google.gson.Gson().fromJson(errorBody, com.aurex.android.models.ValidationErrorResponse::class.java)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse validation error response JSON", e)
            throw e
        }
    }

    /**
     * Calculate exponential backoff for retries
     * Formula: min(2^attempt * 1000ms, 5 minutes)
     */
    private fun calculateBackoff(attempt: Int): Long {
        val baseDelayMs = 1000L
        val maxDelayMs = 5 * 60 * 1000L // 5 minutes
        val exponentialDelay = baseDelayMs * (1 shl attempt.coerceIn(0, 10)) // 2^attempt, max 2^10
        return exponentialDelay.coerceAtMost(maxDelayMs)
    }

    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false

        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun generateServerId(smsEntity: com.aurex.android.database.SmsEntity): String {
        return "${smsEntity.userId}_${smsEntity.receivedAt}_${smsEntity.sender.hashCode()}"
    }
}
