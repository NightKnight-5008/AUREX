package com.aurex.android.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aurex.android.database.SmsEntity
import com.aurex.android.observability.ObservabilityManager
import com.aurex.android.repository.SmsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * SMS ViewModel - MVVM Architecture (Phase 2)
 * Manages SMS data and business logic for UI layer
 */
@HiltViewModel
class SmsViewModel @Inject constructor(
    private val repository: SmsRepository,
    private val observabilityManager: ObservabilityManager
) : ViewModel() {

    // UI State
    private val _syncStatus = MutableLiveData<SyncStatus>()
    val syncStatus: LiveData<SyncStatus> = _syncStatus

    private val _pendingCount = MutableLiveData<Int>()
    val pendingCount: LiveData<Int> = _pendingCount

    private val _failedCount = MutableLiveData<Int>()
    val failedCount: LiveData<Int> = _failedCount

    sealed class SyncStatus {
        object Idle : SyncStatus()
        object Syncing : SyncStatus()
        data class Success(val syncedCount: Int) : SyncStatus()
        data class Error(val message: String) : SyncStatus()
    }

    init {
        Timber.d("SmsViewModel initialized")
        observabilityManager.trackEvent("viewmodel_created", mapOf(
            "viewmodel" to "SmsViewModel"
        ))
        loadSyncCounts()
    }

    /**
     * Get all pending SMS messages
     */
    fun getPendingSms(): Flow<List<SmsEntity>> {
        return repository.getPendingSms()
    }

    /**
     * Get SMS messages by sync status
     */
    fun getSmsByStatus(status: String): Flow<List<SmsEntity>> {
        return repository.getSmsByStatus(status)
    }

    /**
     * Get SMS count by status
     */
    fun getSmsCountByStatus(status: String): Flow<Int> {
        return repository.getSmsCountByStatus(status)
    }

    /**
     * Manual sync trigger from UI
     */
    fun triggerManualSync() {
        viewModelScope.launch {
            try {
                _syncStatus.value = SyncStatus.Syncing
                Timber.i("Manual SMS sync triggered from UI")
                observabilityManager.trackEvent("manual_sync_triggered", mapOf(
                    "source" to "viewmodel"
                ))

                // Trigger WorkManager sync
                // Note: Actual implementation would use WorkManager
                // repository.triggerSync()

                _syncStatus.value = SyncStatus.Success(0)
            } catch (e: Exception) {
                Timber.e(e, "Manual sync failed")
                _syncStatus.value = SyncStatus.Error(e.message ?: "Unknown error")
                observabilityManager.recordException(e, mapOf(
                    "context" to "manual_sync"
                ))
            }
        }
    }

    /**
     * Load sync statistics
     */
    private fun loadSyncCounts() {
        viewModelScope.launch {
            try {
                repository.getSmsCountByStatus("pending").collect { count ->
                    _pendingCount.value = count
                }
            } catch (e: Exception) {
                Timber.e(e, "Error loading pending count")
            }
        }

        viewModelScope.launch {
            try {
                repository.getSmsCountByStatus("failed").collect { count ->
                    _failedCount.value = count
                }
            } catch (e: Exception) {
                Timber.e(e, "Error loading failed count")
            }
        }
    }

    /**
     * Mark message as synced (for manual resolution)
     */
    fun markAsSynced(messageId: Long) {
        viewModelScope.launch {
            try {
                repository.updateSyncStatus(messageId, "synced")
                Timber.i("Message $messageId marked as synced")
                loadSyncCounts() // Refresh counts
            } catch (e: Exception) {
                Timber.e(e, "Error marking message as synced")
            }
        }
    }

    /**
     * Retry failed message
     */
    fun retryFailedMessage(messageId: Long) {
        viewModelScope.launch {
            try {
                repository.updateSyncStatus(messageId, "pending")
                Timber.i("Message $messageId marked for retry")
                observabilityManager.trackEvent("message_retry", mapOf(
                    "message_id" to messageId.toString()
                ))
                loadSyncCounts()
            } catch (e: Exception) {
                Timber.e(e, "Error retrying message")
            }
        }
    }

    /**
     * Clear all synced messages (cleanup)
     */
    fun clearSyncedMessages() {
        viewModelScope.launch {
            try {
                val count = repository.deleteSyncedMessages()
                Timber.i("Cleared $count synced messages")
                observabilityManager.trackEvent("synced_messages_cleared", mapOf(
                    "count" to count.toString()
                ))
            } catch (e: Exception) {
                Timber.e(e, "Error clearing synced messages")
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        Timber.d("SmsViewModel cleared")
    }
}
