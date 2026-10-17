package com.aurex.android.models

/**
 * Enterprise API Models
 *
 * Workspace-based device binding and SMS ingestion.
 */

// ==================== WORKSPACE VERIFICATION ====================

data class WorkspaceVerificationRequest(
    val workspaceUsername: String,
    val deviceToken: String,
    val deviceId: String,
    val deviceName: String,
    val appVersion: String
)

data class WorkspaceVerificationResponse(
    val success: Boolean,
    val message: String? = null,
    val workspaceId: String? = null,
    val deviceAuthToken: String? = null // New token for device authentication
)

// ==================== SMS SYNC (Enterprise-grade) ====================

data class SmsSyncRequestEnterprise(
    val workspaceId: String,
    val deviceId: String,
    val smsHash: String, // SHA-256(sender + received_at_utc + content)
    val sender: String,
    val content: String,
    val receivedAtUtc: String, // ISO 8601 UTC timestamp
    val deviceTimezoneOffset: Int, // Minutes from UTC
    val deviceLocale: String, // e.g. "en_US"
    val phoneNumber: String,
    val likelyFinancial: Boolean? = null
)

data class SmsSyncResponseEnterprise(
    val success: Boolean,
    val message: String? = null,
    val serverId: String? = null, // Server-assigned ID or smsHash
    val duplicate: Boolean = false // True if backend rejected as duplicate
)

// ==================== HEARTBEAT ====================

data class HeartbeatRequest(
    val workspaceId: String,
    val deviceId: String,
    val batteryLevel: Int, // Percentage (0-100)
    val batteryCharging: Boolean,
    val networkStatus: String, // "wifi", "cellular", "ethernet", "disconnected"
    val lastSmsForwardedAt: Long?, // Timestamp in milliseconds
    val localQueueSize: Int, // Pending SMS count
    val appVersion: String,
    val androidVersion: String,
    val timestamp: Long // Current timestamp
)

data class HeartbeatResponse(
    val success: Boolean,
    val message: String? = null,
    val serverTime: Long? = null,
    val deviceConfig: DeviceConfigResponse? = null // ✅ NEW: Device configuration from server
)

/**
 * Device Configuration Response
 * Returned with heartbeat to sync device settings from desktop → Android
 */
data class DeviceConfigResponse(
    val devicePriority: Int, // Priority level (1-10, higher = more important)
    val enabled: Boolean = true, // Whether device should forward SMS
    val syncIntervalMinutes: Int? = null, // Custom sync interval override
    val updatedAt: Long // Server timestamp of last config change
)

// ==================== DEVICE STATUS ====================

data class DeviceStatusResponse(
    val connected: Boolean,
    val workspaceId: String,
    val workspaceUsername: String,
    val lastSeen: Long?,
    val lastSmsForwarded: Long?,
    val pendingQueue: Int,
    val totalSynced: Int
)
