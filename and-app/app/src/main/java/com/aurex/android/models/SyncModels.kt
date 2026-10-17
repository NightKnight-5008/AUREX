package com.aurex.android.models

import com.google.gson.annotations.SerializedName

// ==================== AUTH ====================

data class RegisterRequest(
    @SerializedName("email")
    val email: String,

    @SerializedName("password")
    val password: String,

    @SerializedName("security_key")
    val securityKey: String
)

data class RegisterResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String?,

    @SerializedName("token")
    val token: String?,

    @SerializedName("user")
    val user: User?
)

// ==================== CREDIT CARD ====================

data class CreditCard(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("user_id")
    val userId: String? = null,

    @SerializedName("alias_name")
    val aliasName: String? = null,

    @SerializedName("last_four_digits")
    val lastFourDigits: String? = null,

    @SerializedName("card_network")
    val cardNetwork: String? = null,

    @SerializedName("limit_amount")
    val limitAmount: Double? = null,

    @SerializedName("current_balance")
    val currentBalance: Double? = null,

    @SerializedName("outstanding_debt")
    val outstandingDebt: Double? = null,

    @SerializedName("minimum_payment")
    val minimumPayment: Double? = null,

    @SerializedName("due_date")
    val dueDate: String? = null,

    @SerializedName("payment_status")
    val paymentStatus: String? = null,

    @SerializedName("billing_cycle_day")
    val billingCycleDay: Int? = null,

    @SerializedName("created_at")
    val createdAt: String? = null,

    @SerializedName("updated_at")
    val updatedAt: String? = null
)

// ==================== TRANSACTION ====================

data class Transaction(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("user_id")
    val userId: String? = null,

    @SerializedName("card_id")
    val cardId: String? = null,

    @SerializedName("transaction_type")
    val transactionType: String? = null,

    @SerializedName("amount")
    val amount: Double? = null,

    @SerializedName("description")
    val description: String? = null,

    @SerializedName("category")
    val category: String? = null,

    @SerializedName("transaction_date")
    val transactionDate: String? = null,

    @SerializedName("created_at")
    val createdAt: String? = null,

    @SerializedName("updated_at")
    val updatedAt: String? = null
)

// ==================== SETTINGS ====================

data class Settings(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("user_id")
    val userId: String? = null,

    @SerializedName("country")
    val country: String? = null,

    @SerializedName("currency")
    val currency: String? = null,

    @SerializedName("language")
    val language: String? = null,

    @SerializedName("theme")
    val theme: String? = null,

    @SerializedName("created_at")
    val createdAt: String? = null,

    @SerializedName("updated_at")
    val updatedAt: String? = null
)

// ==================== REMINDER ====================

data class Reminder(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("user_id")
    val userId: String? = null,

    @SerializedName("card_id")
    val cardId: String? = null,

    @SerializedName("payment_amount")
    val paymentAmount: Double? = null,

    @SerializedName("payment_due_date")
    val paymentDueDate: String? = null,

    @SerializedName("payment_status")
    val paymentStatus: String? = null,

    @SerializedName("card_last_four")
    val cardLastFour: String? = null,

    @SerializedName("card_name")
    val cardName: String? = null,

    @SerializedName("reminder_scheduled_date")
    val reminderScheduledDate: String? = null,

    @SerializedName("reminder_scheduled_time")
    val reminderScheduledTime: String? = null,

    @SerializedName("reminder_sent")
    val reminderSent: Boolean? = null,

    @SerializedName("reminder_sent_at")
    val reminderSentAt: String? = null,

    @SerializedName("created_at")
    val createdAt: String? = null,

    @SerializedName("updated_at")
    val updatedAt: String? = null
)

// ==================== SMS LOG ====================

data class SmsLog(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("user_id")
    val userId: String? = null,

    @SerializedName("sender")
    val sender: String? = null,

    @SerializedName("content")
    val content: String? = null,

    @SerializedName("received_at")
    val receivedAt: String? = null,

    @SerializedName("processed")
    val processed: Boolean? = null,

    @SerializedName("card_id")
    val cardId: String? = null,

    @SerializedName("created_at")
    val createdAt: String? = null
)

// ==================== AI SMS CLASSIFY ====================

data class SmsClassifyRequest(
    @SerializedName("sender")
    val sender: String,

    @SerializedName("content")
    val content: String
)

data class SmsClassifyResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("is_financial")
    val isFinancial: Boolean,

    @SerializedName("confidence")
    val confidence: Double? = null,

    @SerializedName("category")
    val category: String? = null,

    @SerializedName("message")
    val message: String? = null
)

// ==================== AI FINANCIAL ANALYSIS ====================

data class FinancialAnalysisResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String? = null,

    @SerializedName("total_balance")
    val totalBalance: Double? = null,

    @SerializedName("total_debt")
    val totalDebt: Double? = null,

    @SerializedName("total_minimum_payments")
    val totalMinimumPayments: Double? = null,

    @SerializedName("cards")
    val cards: List<CreditCard>? = null,

    @SerializedName("transactions")
    val transactions: List<Transaction>? = null,

    @SerializedName("analysis")
    val analysis: String? = null,

    @SerializedName("recommendations")
    val recommendations: List<String>? = null
)

// ==================== SYNC HEARTBEAT ====================

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
