package com.aurex.android.models

import com.google.gson.annotations.SerializedName

/**
 * Sync heartbeat request to keep connection alive
 * Sent every 2-3 minutes when app is active
 */
data class SyncHeartbeatRequest(
    @SerializedName("device_name")
    val deviceName: String,

    @SerializedName("device_id")
    val deviceId: String,

    @SerializedName("phone_count")
    val phoneCount: Int,

    @SerializedName("messages_synced")
    val messagesSynced: Int,

    @SerializedName("app_version")
    val appVersion: String,

    @SerializedName("timestamp")
    val timestamp: Long
)

/**
 * Sync heartbeat response
 */
data class SyncHeartbeatResponse(
    @SerializedName("status")
    val status: String,

    @SerializedName("server_time")
    val serverTime: Long,

    @SerializedName("next_heartbeat_in")
    val nextHeartbeatIn: Int // seconds
)

/**
 * Sync status response
 */
data class SyncStatusResponse(
    @SerializedName("is_connected")
    val isConnected: Boolean,

    @SerializedName("last_sync_time")
    val lastSyncTime: Long?,

    @SerializedName("device_name")
    val deviceName: String?,

    @SerializedName("phone_count")
    val phoneCount: Int,

    @SerializedName("messages_synced")
    val messagesSynced: Int,

    @SerializedName("connected_semi_accounts")
    val connectedSemiAccounts: List<String>
)

/**
 * SMS Sync Request
 */
data class SmsSyncRequest(
    @SerializedName("messages")
    val messages: List<SmsMessage>
)

/**
 * SMS Sync Response (Success)
 */
data class SmsSyncResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String?,

    @SerializedName("synced_count")
    val syncedCount: Int? = null
)

/**
 * Conflict Resolution Response (HTTP 409)
 * Returned when a message already exists on the server
 */
data class ConflictResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String,

    @SerializedName("conflict_type")
    val conflictType: String, // "duplicate_message", "already_synced"

    @SerializedName("conflicts")
    val conflicts: List<ConflictData>
)

/**
 * Individual conflict data
 */
data class ConflictData(
    @SerializedName("local_id")
    val localId: String?,

    @SerializedName("server_id")
    val serverId: String,

    @SerializedName("server_received_at")
    val serverReceivedAt: String,

    @SerializedName("resolution")
    val resolution: String // "use_server_id", "merge"
)

/**
 * Validation Error Response (HTTP 422)
 * Returned when message data is malformed
 */
data class ValidationErrorResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String,

    @SerializedName("validation_errors")
    val validationErrors: List<ValidationError>
)

/**
 * Individual validation error
 */
data class ValidationError(
    @SerializedName("field")
    val field: String,

    @SerializedName("error")
    val error: String,

    @SerializedName("local_id")
    val localId: String?
)
