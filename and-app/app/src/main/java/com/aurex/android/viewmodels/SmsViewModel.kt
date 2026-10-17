package com.aurex.android.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aurex.android.database.SmsEntity
import com.aurex.android.repository.SmsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * ViewModel for SMS data management
 * Follows MVVM architecture pattern
 *
 * Injected via Hilt DI
 */
@HiltViewModel
class SmsViewModel @Inject constructor(
    private val smsRepository: SmsRepository
) : ViewModel() {

    // LiveData for SMS list
    private val _smsMessages = MutableLiveData<List<SmsEntity>>()
    val smsMessages: LiveData<List<SmsEntity>> = _smsMessages

    // LiveData for sync statistics
    private val _syncStats = MutableLiveData<Map<String, Int>>()
    val syncStats: LiveData<Map<String, Int>> = _syncStats

    // LiveData for loading state
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    // LiveData for error messages
    private val _errorMessage = MutableLiveData<String?>()
    val errorMessage: LiveData<String?> = _errorMessage

    /**
     * Load all SMS messages from database
     */
    fun loadAllSms(userId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val messages = smsRepository.getSmsByUserId(userId)
                _smsMessages.value = messages
                Timber.d("Loaded ${messages.size} SMS messages for user $userId")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load SMS messages")
                _errorMessage.value = "Failed to load messages: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Load sync statistics
     */
    fun loadSyncStats() {
        viewModelScope.launch {
            try {
                val stats = smsRepository.getSyncStats()
                _syncStats.value = stats
                Timber.d("Sync stats loaded: $stats")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load sync stats")
                _errorMessage.value = "Failed to load sync stats: ${e.message}"
            }
        }
    }

    /**
     * Get unsynced message count
     */
    fun getUnsyncedCount(): LiveData<Int> {
        val result = MutableLiveData<Int>()
        viewModelScope.launch {
            try {
                val count = smsRepository.getUnsyncedCount()
                result.value = count
            } catch (e: Exception) {
                Timber.e(e, "Failed to get unsynced count")
                result.value = 0
            }
        }
        return result
    }

    /**
     * Get failed SMS messages
     */
    fun getFailedMessages(): LiveData<List<SmsEntity>> {
        val result = MutableLiveData<List<SmsEntity>>()
        viewModelScope.launch {
            try {
                val failed = smsRepository.getFailedSms()
                result.value = failed
                Timber.d("Found ${failed.size} failed messages")
            } catch (e: Exception) {
                Timber.e(e, "Failed to get failed messages")
                result.value = emptyList()
            }
        }
        return result
    }

    /**
     * Retry failed sync for a specific message
     */
    fun retryFailedSync(messageId: Long) {
        viewModelScope.launch {
            try {
                smsRepository.retryFailedSync(messageId)
                Timber.i("Retrying sync for message $messageId")
                // Refresh data
                loadSyncStats()
            } catch (e: Exception) {
                Timber.e(e, "Failed to retry sync for message $messageId")
                _errorMessage.value = "Failed to retry sync: ${e.message}"
            }
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _errorMessage.value = null
    }
}
