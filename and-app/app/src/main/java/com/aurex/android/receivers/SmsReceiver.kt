package com.aurex.android.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.telephony.SmsMessage
import android.telephony.TelephonyManager
import android.util.Log
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.aurex.android.BuildConfig
import com.aurex.android.database.SmsEntity
import com.aurex.android.repository.SmsRepository
import com.aurex.android.utils.EncryptionUtils
import com.aurex.android.utils.PreferenceManager
import com.aurex.android.utils.SecureLogger
import com.aurex.android.utils.SmsPreprocessor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)

            for (smsMessage in messages) {
                processSmsMessage(context, smsMessage)
            }
        }
    }

    private fun processSmsMessage(context: Context, smsMessage: SmsMessage) {
        val sender = smsMessage.originatingAddress ?: "Unknown"
        val content = smsMessage.messageBody ?: ""
        val timestamp = smsMessage.timestampMillis

        Log.d(TAG, "SMS Received - Sender: $sender")

        // Initialize secure logger
        val secureLogger = SecureLogger(context)

        // Get user info from preferences
        val preferenceManager = PreferenceManager(context)
        val userId = preferenceManager.getUserId()
        val authToken = preferenceManager.getAuthToken()

        if (userId == null || authToken == null) {
            Log.w(TAG, "User not logged in, SMS will not be stored")
            secureLogger.logWarning("SMS received but user not logged in - discarding")
            return
        }

        // Get phone number
        val phoneNumber = getPhoneNumber(context)

        // Store SMS in local database first (offline-first approach)
        val smsRepository = SmsRepository(context)

        // Store locally using coroutine
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Preprocessing: Classify as financial or non-financial
                val isFinancial = SmsPreprocessor.classifyFinancial(sender, content)

                if (isFinancial == null) {
                    // SMS rejected (OTP/marketing)
                    Log.d(TAG, "SMS rejected (OTP/Marketing): $sender")
                    secureLogger.logInfo("SMS rejected (OTP/Marketing) from $sender")
                    return@launch
                }

                // Encrypt SMS content using E2EE
                val encryptedContent = try {
                    EncryptionUtils.encryptSmsContent(content)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to encrypt SMS content", e)
                    secureLogger.logError("Encryption failed for SMS from $sender", e)
                    return@launch
                }

                // Generate security metadata
                val contentHash = EncryptionUtils.generateContentHash(content)
                val messageFingerprint = EncryptionUtils.generateMessageFingerprint(sender, timestamp, content)

                // Optionally encrypt metadata (sender can be kept plain for UI display, or encrypted)
                val encryptedSender = try {
                    EncryptionUtils.encryptMetadata(sender)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to encrypt metadata, storing plain", e)
                    sender
                }

                val smsEntity = SmsEntity(
                    userId = userId,
                    semiAccountId = null,
                    phoneNumber = phoneNumber,
                    sender = encryptedSender,
                    content = encryptedContent,
                    receivedAt = timestamp,
                    processed = false,
                    synced = false,
                    syncStatus = "pending",
                    syncAttempts = 0,
                    lastSyncAttempt = null,
                    nextRetryAt = null,
                    syncErrorMessage = null,
                    serverId = null,
                    isEncrypted = true,
                    encryptedMetadata = true,
                    contentHash = contentHash,
                    tamperDetected = false,
                    messageFingerprint = messageFingerprint,
                    conflictDetected = false,
                    locallyPreprocessed = true,
                    likelyFinancial = isFinancial,
                    appVersion = BuildConfig.VERSION_NAME,
                    schemaVersion = 2,
                    createdAt = System.currentTimeMillis()
                )

                val smsId = smsRepository.insertSms(smsEntity)
                Log.d(TAG, "SMS stored locally with ID: $smsId (encrypted, ${if (isFinancial) "financial" else "non-financial"})")

                secureLogger.logInfo("SMS received and encrypted: ID $smsId, financial=$isFinancial")
                secureLogger.logSyncEvent("SmsReceived", mapOf(
                    "smsId" to smsId,
                    "financial" to isFinancial,
                    "encrypted" to true
                ))

                // Schedule immediate sync work
                scheduleSyncWork(context, smsId, userId, authToken)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to store SMS locally", e)
                secureLogger.logError("Failed to process SMS from $sender", e)
            }
        }
    }

    private fun scheduleSyncWork(context: Context, smsId: Long, userId: String, authToken: String) {
        val workData = workDataOf(
            "sms_id" to smsId,
            "user_id" to userId,
            "auth_token" to authToken
        )

        val syncWorkRequest = OneTimeWorkRequestBuilder<SmsSyncWorker>()
            .setInputData(workData)
            .build()

        WorkManager.getInstance(context).enqueue(syncWorkRequest)

        Log.d(TAG, "SMS sync work scheduled for ID: $smsId")
    }

    private fun getPhoneNumber(context: Context): String {
        return try {
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
            telephonyManager.line1Number ?: "Unknown"
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get phone number", e)
            "Unknown"
        }
    }
}
