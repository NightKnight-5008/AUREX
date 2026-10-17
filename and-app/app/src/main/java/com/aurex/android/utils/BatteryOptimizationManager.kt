package com.aurex.android.utils

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import timber.log.Timber

/**
 * Battery Optimization Manager - Phase 3
 * Handles battery optimization exemptions for reliable background sync
 */
object BatteryOptimizationManager {

    /**
     * Check if battery optimization is ignored for the app
     */
    fun isBatteryOptimizationIgnored(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val packageName = context.packageName
            val isIgnored = powerManager?.isIgnoringBatteryOptimizations(packageName) ?: false
            Timber.d("Battery optimization ignored: $isIgnored")
            return isIgnored
        }
        return true // Pre-M devices don't have battery optimization
    }

    /**
     * Request battery optimization exemption
     * Should be called with user consent
     */
    fun requestBatteryOptimizationExemption(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!isBatteryOptimizationIgnored(context)) {
                try {
                    val intent = Intent().apply {
                        action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                        data = Uri.parse("package:${context.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    Timber.i("Battery optimization exemption requested")
                } catch (e: Exception) {
                    Timber.e(e, "Error requesting battery optimization exemption")
                    // Fallback: Open battery optimization settings
                    openBatteryOptimizationSettings(context)
                }
            }
        }
    }

    /**
     * Open battery optimization settings page
     */
    fun openBatteryOptimizationSettings(context: Context) {
        try {
            val intent = Intent().apply {
                action = Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            Timber.i("Opened battery optimization settings")
        } catch (e: Exception) {
            Timber.e(e, "Error opening battery optimization settings")
        }
    }

    /**
     * Check if the device is in Doze mode
     */
    fun isDeviceIdleMode(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isIdle = powerManager?.isDeviceIdleMode ?: false
            Timber.d("Device idle mode: $isIdle")
            return isIdle
        }
        return false
    }

    /**
     * Get battery optimization status summary for UI display
     */
    fun getBatteryOptimizationStatus(context: Context): BatteryOptimizationStatus {
        val isIgnored = isBatteryOptimizationIgnored(context)
        val isDozeMode = isDeviceIdleMode(context)

        return BatteryOptimizationStatus(
            isOptimizationIgnored = isIgnored,
            isDeviceInDozeMode = isDozeMode,
            canRequestExemption = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M,
            recommendation = when {
                isIgnored -> "Battery optimization disabled. Background sync will work reliably."
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ->
                    "Battery optimization is enabled. This may delay SMS sync. Tap to disable."
                else -> "Battery optimization not applicable for this Android version."
            }
        )
    }

    data class BatteryOptimizationStatus(
        val isOptimizationIgnored: Boolean,
        val isDeviceInDozeMode: Boolean,
        val canRequestExemption: Boolean,
        val recommendation: String
    )
}
