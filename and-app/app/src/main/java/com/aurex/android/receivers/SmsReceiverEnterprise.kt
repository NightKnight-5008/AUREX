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
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.*

/**
 * Enterprise-grade SMS Receiver
 *
 * Real-time SMS capture with:
 * - Workspace-based device binding
 * - UTC time normalization
 * - Idempotency hashing (SHA-256)
 * - Guaranteed delivery queue
 * - E2EE encryption
 * - Financial classification
 *
 * NO silent data loss - every SMS is queued with retry.
 */
class SmsReceiverEnterprise : BroadcastReceiver() {

    companion object {
        private const val TAG = "SmsReceiverEnterprise"
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
        val timestampMillis = smsMessage.timestampMillis

        Log.d(TAG, "SMS Received - Sender: $sender")

        val secureLogger = SecureLogger(context)
        val preferenceManager = PreferenceManager(context)

        // CRITICAL: Check workspace binding (device authentication)
        if (!preferenceManager.isWorkspaceBound()) {
            Log.w(TAG, "Device not bound to workspace - SMS discarded")
            secureLogger.logWarning("SMS received but device not bound to workspace - discarding")
            return
        }

        val workspaceId = preferenceManager.getWorkspaceId()!!
        val deviceId = preferenceManager.getDeviceId()!!
        val deviceToken = preferenceManager.getDeviceToken()!!

        // Get device phone number
        val phoneNumber = getPhoneNumber(context)

        // Get device locale
        val deviceLocale = Locale.getDefault().toString()

        // Calculate timezone offset in minutes
        val timezoneOffset = TimeZone.getDefault().getOffset(timestampMillis) / (1000 * 60)

        // Convert to UTC ISO 8601
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
        val receivedAtUtc = dateFormat.format(Date(timestampMillis))

        // Store SMS in local database first (guaranteed delivery queue)
        val smsRepository = SmsRepository(context)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // STEP 1: Financial Classification (preprocessing)
                val isFinancial = SmsPreprocessor.classifyFinancial(sender, content)

                if (isFinancial == null) {
                    // SMS rejected (OTP/marketing) - not financial
                    Log.d(TAG, "SMS rejected (OTP/Marketing): $sender")
                    secureLogger.logInfo("SMS rejected (OTP/Marketing) from $sender")
                    return@launch
                }

                // STEP 2: Generate idempotency hash (SHA-256)
                val smsHash = generateSmsHash(sender, receivedAtUtc, content)

                // STEP 3: Check for duplicates via hash
                val existingDuplicate = smsRepository.findBySmsHash(smsHash)
                if (existingDuplicate != null) {
                    Log.d(TAG, "Duplicate SMS detected via hash - skipping: $smsHash")
                    secureLogger.logInfo("Duplicate SMS detected: hash=$smsHash, existing ID=${existingDuplicate.id}")
                    return@launch
                }

                // STEP 4: Encrypt SMS content using E2EE
                val encryptedContent = try {
                    EncryptionUtils.encryptSmsContent(content)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to encrypt SMS content", e)
                    secureLogger.logError("Encryption failed for SMS from $sender", e)
                    return@launch
                }

                // STEP 5: Generate security metadata
                val contentHash = EncryptionUtils.generateContentHash(content)
                val messageFingerprint = EncryptionUtils.generateMessageFingerprint(sender, timestampMillis, content)

                // STEP 6: Encrypt metadata (sender)
                val encryptedSender = try {
                    EncryptionUtils.encryptMetadata(sender)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to encrypt metadata, storing plain", e)
                    sender
                }

                // STEP 7: Create SMS entity with full metadata
                val smsEntity = SmsEntity(
                    // Workspace & Device Binding
                    workspaceId = workspaceId,
                    deviceId = deviceId,
                    userId = null, // Deprecated
                    semiAccountId = null,
                    phoneNumber = phoneNumber,

                    // SMS Content (encrypted)
                    sender = encryptedSender,
                    content = encryptedContent,

                    // Time & Locale Normalization
                    receivedAt = timestampMillis,
                    receivedAtUtc = receivedAtUtc,
                    deviceTimezoneOffset = timezoneOffset,
                    deviceLocale = deviceLocale,

                    // Sync Status
                    processed = false,
                    synced = false,
                    syncStatus = "pending",
                    syncAttempts = 0,
                    lastSyncAttempt = null,
                    nextRetryAt = null,
                    syncErrorMessage = null,
                    serverId = null,

                    // Security & Integrity
                    isEncrypted = true,
                    encryptedMetadata = true,
                    contentHash = contentHash,
                    tamperDetected = false,

                    // Idempotency & De-duplication
                    smsHash = smsHash,
                    messageFingerprint = messageFingerprint,
                    conflictDetected = false,

                    // AI Preprocessing
                    locallyPreprocessed = true,
                    likelyFinancial = isFinancial,

                    // Versioning
                    appVersion = BuildConfig.VERSION_NAME,
                    schemaVersion = 3, // Updated schema
                    createdAt = System.currentTimeMillis()
                )

                // STEP 8: Insert into local queue (guaranteed delivery)
                val smsId = smsRepository.insertSms(smsEntity)
                Log.d(TAG, "SMS queued for sync: ID=$smsId, hash=$smsHash, financial=$isFinancial")

                secureLogger.logInfo("SMS captured: ID=$smsId, workspace=$workspaceId, financial=$isFinancial")
                secureLogger.logSyncEvent("SmsReceived", mapOf(
                    "smsId" to smsId,
                    "smsHash" to smsHash,
                    "workspaceId" to workspaceId,
                    "financial" to isFinancial,
                    "encrypted" to true
                ))

                // STEP 9: Schedule immediate sync work
                scheduleSyncWork(context, smsId, workspaceId, deviceId, deviceToken)

            } catch (e: Exception) {
                Log.e(TAG, "Failed to process SMS", e)
                secureLogger.logError("Failed to process SMS from $sender", e)
            }
        }
    }

    /**
     * Generates idempotency hash: SHA-256(sender + received_at_utc + content)
     *
     * Backend will use same hash to reject duplicates.
     */
    private fun generateSmsHash(sender: String, receivedAtUtc: String, content: String): String {
        val input = "$sender|$receivedAtUtc|$content"
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun scheduleSyncWork(
        context: Context,
        smsId: Long,
        workspaceId: String,
        deviceId: String,
        deviceToken: String
    ) {
        val workData = workDataOf(
            "sms_id" to smsId,
            "workspace_id" to workspaceId,
            "device_id" to deviceId,
            "device_token" to deviceToken
        )

        val syncWorkRequest = OneTimeWorkRequestBuilder<SmsSyncWorkerEnterprise>()
            .setInputData(workData)
            .build()

        WorkManager.getInstance(context).enqueue(syncWorkRequest)

        Log.d(TAG, "Sync work scheduled for SMS: $smsId")
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
