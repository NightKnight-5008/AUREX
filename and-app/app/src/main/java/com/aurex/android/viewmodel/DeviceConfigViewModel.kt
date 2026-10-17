package com.aurex.android.viewmodel

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aurex.android.observability.ObservabilityManager
import com.aurex.android.utils.DualSimManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * Device Configuration ViewModel - MVVM Architecture (Phase 3)
 * Manages device settings, SIM configuration, and sync preferences
 */
@HiltViewModel
class DeviceConfigViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val observabilityManager: ObservabilityManager
) : ViewModel() {

    // Device capabilities
    private val _isDualSim = MutableLiveData<Boolean>()
    val isDualSim: LiveData<Boolean> = _isDualSim

    private val _simCards = MutableLiveData<List<DualSimManager.SimInfo>>()
    val simCards: LiveData<List<DualSimManager.SimInfo>> = _simCards

    // Sync configuration
    private val _syncEnabled = MutableLiveData<Boolean>()
    val syncEnabled: LiveData<Boolean> = _syncEnabled

    private val _syncInterval = MutableLiveData<Long>()
    val syncInterval: LiveData<Long> = _syncInterval

    // Battery optimization status
    private val _batteryOptimizationIgnored = MutableLiveData<Boolean>()
    val batteryOptimizationIgnored: LiveData<Boolean> = _batteryOptimizationIgnored

    init {
        Timber.d("DeviceConfigViewModel initialized")
        loadDeviceConfig()
    }

    private fun loadDeviceConfig() {
        viewModelScope.launch {
            try {
                // Check dual SIM capability
                val dualSim = DualSimManager.isDualSimDevice(context)
                _isDualSim.value = dualSim

                // Load SIM cards
                val sims = DualSimManager.getActiveSimCards(context)
                _simCards.value = sims

                Timber.i("Device config loaded: dualSim=$dualSim, simCount=${sims.size}")
                observabilityManager.trackEvent("device_config_loaded", mapOf(
                    "dual_sim" to dualSim.toString(),
                    "sim_count" to sims.size.toString()
                ))

                // Load sync preferences
                loadSyncPreferences()
            } catch (e: Exception) {
                Timber.e(e, "Error loading device config")
                observabilityManager.recordException(e, mapOf(
                    "context" to "device_config_load"
                ))
            }
        }
    }

    private fun loadSyncPreferences() {
        // Load from SharedPreferences
        val prefs = context.getSharedPreferences("aurex_config", Context.MODE_PRIVATE)
        _syncEnabled.value = prefs.getBoolean("sync_enabled", true)
        _syncInterval.value = prefs.getLong("sync_interval_minutes", 15)
    }

    fun setSyncEnabled(enabled: Boolean) {
        viewModelScope.launch {
            val prefs = context.getSharedPreferences("aurex_config", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("sync_enabled", enabled).apply()
            _syncEnabled.value = enabled

            observabilityManager.trackEvent("sync_enabled_changed", mapOf(
                "enabled" to enabled.toString()
            ))
        }
    }

    fun setSyncInterval(minutes: Long) {
        viewModelScope.launch {
            val prefs = context.getSharedPreferences("aurex_config", Context.MODE_PRIVATE)
            prefs.edit().putLong("sync_interval_minutes", minutes).apply()
            _syncInterval.value = minutes

            observabilityManager.trackEvent("sync_interval_changed", mapOf(
                "minutes" to minutes.toString()
            ))
        }
    }

    fun refreshSimCards() {
        viewModelScope.launch {
            val sims = DualSimManager.getActiveSimCards(context)
            _simCards.value = sims
            Timber.i("SIM cards refreshed: count=${sims.size}")
        }
    }
}
