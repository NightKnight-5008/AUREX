package com.aurex.android.database

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sms_messages")
data class SmsEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    // WORKSPACE & DEVICE BINDING (Enterprise-grade)
    @ColumnInfo(name = "workspace_id")
    val workspaceId: String,

    @ColumnInfo(name = "device_id")
    val deviceId: String,

    @ColumnInfo(name = "user_id")
    val userId: String? = null, // Deprecated - kept for migration

    @ColumnInfo(name = "semi_account_id")
    val semiAccountId: String?,

    @ColumnInfo(name = "phone_number")
    val phoneNumber: String,

    // DUAL SIM SUPPORT (Phase 3)
    @ColumnInfo(name = "sim_slot")
    val simSlot: Int? = null, // 0 = SIM 1, 1 = SIM 2, null = unknown/single SIM

    @ColumnInfo(name = "sim_subscription_id")
    val simSubscriptionId: Int? = null, // Android subscription ID

    @ColumnInfo(name = "sim_carrier_name")
    val simCarrierName: String? = null, // Carrier name (e.g., "Verizon", "T-Mobile")

    @ColumnInfo(name = "sender")
    val sender: String,

    // Encrypted content - E2EE
    @ColumnInfo(name = "content")
    val content: String,

    // TIME & LOCALE NORMALIZATION
    @ColumnInfo(name = "received_at")
    val receivedAt: Long, // Timestamp in milliseconds

    @ColumnInfo(name = "received_at_utc")
    val receivedAtUtc: String, // ISO 8601 UTC timestamp

    @ColumnInfo(name = "device_timezone_offset")
    val deviceTimezoneOffset: Int, // Minutes from UTC

    @ColumnInfo(name = "device_locale")
    val deviceLocale: String, // Device locale (e.g. "en_US")

    @ColumnInfo(name = "processed")
    val processed: Boolean = false,

    // Sync status tracking
    @ColumnInfo(name = "synced")
    val synced: Boolean = false,

    @ColumnInfo(name = "sync_status")
    val syncStatus: String = "pending", // pending, synced, failed, retrying, conflict

    @ColumnInfo(name = "sync_attempts")
    val syncAttempts: Int = 0,

    @ColumnInfo(name = "last_sync_attempt")
    val lastSyncAttempt: Long? = null,

    @ColumnInfo(name = "next_retry_at")
    val nextRetryAt: Long? = null, // Exponential backoff scheduling

    @ColumnInfo(name = "sync_error_message")
    val syncErrorMessage: String? = null,

    @ColumnInfo(name = "server_id")
    val serverId: String? = null,

    // Security & Integrity
    @ColumnInfo(name = "is_encrypted")
    val isEncrypted: Boolean = true,

    @ColumnInfo(name = "encrypted_metadata")
    val encryptedMetadata: Boolean = true,

    @ColumnInfo(name = "content_hash")
    val contentHash: String? = null, // SHA-256 hash for tamper detection

    @ColumnInfo(name = "tamper_detected")
    val tamperDetected: Boolean = false,

    // IDEMPOTENCY & DE-DUPLICATION (Enterprise-grade)
    @ColumnInfo(name = "sms_hash")
    val smsHash: String, // SHA-256(sender + received_at_utc + content) for idempotency

    @ColumnInfo(name = "message_fingerprint")
    val messageFingerprint: String, // Unique fingerprint for duplicate detection

    @ColumnInfo(name = "conflict_detected")
    val conflictDetected: Boolean = false,

    // AI Preprocessing
    @ColumnInfo(name = "locally_preprocessed")
    val locallyPreprocessed: Boolean = false,

    @ColumnInfo(name = "likely_financial")
    val likelyFinancial: Boolean? = null, // null = unprocessed, true/false = classification

    // Versioning
    @ColumnInfo(name = "app_version")
    val appVersion: String,

    @ColumnInfo(name = "schema_version")
    val schemaVersion: Int = 2, // Current schema version

    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)
