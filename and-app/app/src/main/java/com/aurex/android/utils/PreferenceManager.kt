package com.aurex.android.utils

import android.content.Context
import android.content.SharedPreferences

/**
 * PreferenceManager - Enterprise-grade device binding
 *
 * Stores workspace binding (LOCKED once set):
 * - workspace_id
 * - workspace_username
 * - device_id
 * - device_token (secure authentication)
 *
 * NO user accounts. NO multi-workspace switching.
 * Device binds to exactly ONE workspace.
 */
class PreferenceManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(
        "aurex_prefs",
        Context.MODE_PRIVATE
    )

    companion object {
        // USER SESSION
        private const val KEY_USER_ID = "user_id"
        private const val KEY_EMAIL = "email"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"

        // WORKSPACE BINDING (Enterprise-grade)
        private const val KEY_WORKSPACE_ID = "workspace_id"
        private const val KEY_WORKSPACE_USERNAME = "workspace_username"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_WORKSPACE_BOUND = "workspace_bound"

        // MONITORING
        private const val KEY_LAST_SMS_FORWARDED = "last_sms_forwarded_at"
        private const val KEY_LAST_HEARTBEAT = "last_heartbeat_at"
    }

    // ==================== USER SESSION ====================

    fun setUserId(userId: String) {
        prefs.edit().putString(KEY_USER_ID, userId).apply()
    }

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun setAuthToken(authToken: String) {
        prefs.edit().putString(KEY_AUTH_TOKEN, authToken).apply()
    }

    fun getAuthToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)

    fun saveUserSession(userId: String, email: String, authToken: String) {
        prefs.edit().apply {
            putString(KEY_USER_ID, userId)
            putString(KEY_EMAIL, email)
            putString(KEY_AUTH_TOKEN, authToken)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
    }

    fun getEmail(): String? = prefs.getString(KEY_EMAIL, null)

    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

    fun clearSession() {
        prefs.edit().apply {
            remove(KEY_USER_ID)
            remove(KEY_EMAIL)
            remove(KEY_AUTH_TOKEN)
            remove(KEY_IS_LOGGED_IN)
            apply()
        }
    }

    // ==================== WORKSPACE BINDING ====================

    /**
     * Saves workspace binding (LOCKED - cannot change without unbind)
     */
    fun saveWorkspaceBinding(
        workspaceId: String,
        workspaceUsername: String,
        deviceToken: String,
        deviceId: String
    ) {
        prefs.edit().apply {
            putString(KEY_WORKSPACE_ID, workspaceId)
            putString(KEY_WORKSPACE_USERNAME, workspaceUsername)
            putString(KEY_DEVICE_ID, deviceId)
            putString(KEY_DEVICE_TOKEN, deviceToken)
            putBoolean(KEY_WORKSPACE_BOUND, true)
            apply()
        }
    }

    fun isWorkspaceBound(): Boolean = prefs.getBoolean(KEY_WORKSPACE_BOUND, false)

    fun getWorkspaceId(): String? = prefs.getString(KEY_WORKSPACE_ID, null)

    fun getWorkspaceUsername(): String? = prefs.getString(KEY_WORKSPACE_USERNAME, null)

    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)

    fun getDeviceToken(): String? = prefs.getString(KEY_DEVICE_TOKEN, null)

    fun saveDeviceId(deviceId: String) {
        prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
    }

    fun clearWorkspaceBinding() {
        prefs.edit().apply {
            remove(KEY_WORKSPACE_ID)
            remove(KEY_WORKSPACE_USERNAME)
            remove(KEY_DEVICE_ID)
            remove(KEY_DEVICE_TOKEN)
            putBoolean(KEY_WORKSPACE_BOUND, false)
            apply()
        }
    }

    // ==================== MONITORING ====================

    fun saveLastSmsForwardedAt(timestamp: Long) {
        prefs.edit().putLong(KEY_LAST_SMS_FORWARDED, timestamp).apply()
    }

    fun getLastSmsForwardedAt(): Long? {
        val timestamp = prefs.getLong(KEY_LAST_SMS_FORWARDED, -1L)
        return if (timestamp == -1L) null else timestamp
    }

    fun saveLastHeartbeat(timestamp: Long) {
        prefs.edit().putLong(KEY_LAST_HEARTBEAT, timestamp).apply()
    }

    fun getLastHeartbeat(): Long? {
        val timestamp = prefs.getLong(KEY_LAST_HEARTBEAT, -1L)
        return if (timestamp == -1L) null else timestamp
    }
}
