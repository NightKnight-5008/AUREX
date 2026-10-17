package com.aurex.android.utils

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import androidx.core.app.ActivityCompat
import timber.log.Timber

/**
 * Dual SIM Manager - Extract SIM information from incoming SMS
 * Phase 3 Implementation
 */
object DualSimManager {

    data class SimInfo(
        val simSlot: Int? = null,
        val subscriptionId: Int? = null,
        val carrierName: String? = null,
        val phoneNumber: String? = null
    )

    /**
     * Extract SIM information from SMS extras (Android 5.1+)
     */
    fun extractSimInfoFromSms(context: Context, extras: android.os.Bundle?): SimInfo {
        if (extras == null) {
            Timber.w("No extras provided for SIM extraction")
            return SimInfo()
        }

        // Extract subscription ID from SMS (Android 5.1+)
        val subscriptionId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            extras.getInt("subscription", SubscriptionManager.INVALID_SUBSCRIPTION_ID)
        } else {
            SubscriptionManager.INVALID_SUBSCRIPTION_ID
        }

        if (subscriptionId == SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
            Timber.d("No valid subscription ID found in SMS extras")
            return SimInfo()
        }

        // Get SIM details from SubscriptionManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager

            if (subscriptionManager != null && ActivityCompat.checkSelfPermission(
                    context,
                    Manifest.permission.READ_PHONE_STATE
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                try {
                    val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
                    val simInfo = activeSubscriptions?.find { it.subscriptionId == subscriptionId }

                    if (simInfo != null) {
                        return SimInfo(
                            simSlot = simInfo.simSlotIndex,
                            subscriptionId = simInfo.subscriptionId,
                            carrierName = simInfo.carrierName?.toString(),
                            phoneNumber = simInfo.number
                        )
                    }
                } catch (e: SecurityException) {
                    Timber.e(e, "Permission denied while accessing SIM info")
                } catch (e: Exception) {
                    Timber.e(e, "Error extracting SIM info")
                }
            }
        }

        Timber.d("SIM info extracted: subscriptionId=$subscriptionId")
        return SimInfo(subscriptionId = subscriptionId)
    }

    /**
     * Get all active SIM cards (for device configuration sync)
     */
    fun getActiveSimCards(context: Context): List<SimInfo> {
        val simCards = mutableListOf<SimInfo>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager

            if (subscriptionManager != null && ActivityCompat.checkSelfPermission(
                    context,
                    Manifest.permission.READ_PHONE_STATE
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                try {
                    val activeSubscriptions = subscriptionManager.activeSubscriptionInfoList
                    activeSubscriptions?.forEach { info ->
                        simCards.add(
                            SimInfo(
                                simSlot = info.simSlotIndex,
                                subscriptionId = info.subscriptionId,
                                carrierName = info.carrierName?.toString(),
                                phoneNumber = info.number
                            )
                        )
                    }
                } catch (e: Exception) {
                    Timber.e(e, "Error getting active SIM cards")
                }
            }
        }

        Timber.i("Found ${simCards.size} active SIM card(s)")
        return simCards
    }

    /**
     * Check if device has dual SIM capability
     */
    fun isDualSimDevice(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return telephonyManager?.phoneCount ?: 1 > 1
            }
        }

        // Fallback: check subscription manager
        return getActiveSimCards(context).size > 1
    }
}
