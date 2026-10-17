package com.aurex.android.utils

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

/**
 * Secure logger for encrypted diagnostic logs
 * Helps backend AI analyze edge cases while protecting sensitive data
 */
class SecureLogger(private val context: Context) {

    companion object {
        private const val TAG = "SecureLogger"
        private const val LOG_FILE_NAME = "secure_logs.enc"
        private const val MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
        private const val MAX_LOG_AGE_DAYS = 7L
    }

    private val scope = CoroutineScope(Dispatchers.IO)
    private val logFile = File(context.filesDir, LOG_FILE_NAME)
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US)

    /**
     * Logs informational message with encryption
     */
    fun logInfo(message: String) {
        writeLog("INFO", message, null)
    }

    /**
     * Logs warning with encryption
     */
    fun logWarning(message: String) {
        writeLog("WARN", message, null)
    }

    /**
     * Logs error with optional exception details
     */
    fun logError(message: String, exception: Exception? = null) {
        writeLog("ERROR", message, exception)
    }

    /**
     * Logs sync event for debugging
     */
    fun logSyncEvent(event: String, details: Map<String, Any>) {
        val detailsStr = details.entries.joinToString(", ") { "${it.key}=${it.value}" }
        writeLog("SYNC", "$event | $detailsStr", null)
    }

    /**
     * Writes encrypted log entry
     */
    private fun writeLog(level: String, message: String, exception: Exception?) {
        scope.launch {
            try {
                // Create log entry
                val timestamp = dateFormat.format(Date())
                val exceptionInfo = exception?.let { " | Exception: ${it.message}\n${it.stackTraceToString()}" } ?: ""
                val logEntry = "[$timestamp] [$level] $message$exceptionInfo\n"

                // Encrypt log entry
                val encryptedEntry = try {
                    EncryptionUtils.encryptMetadata(logEntry)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to encrypt log entry", e)
                    return@launch
                }

                // Rotate log if needed
                if (logFile.exists() && logFile.length() > MAX_LOG_SIZE_BYTES) {
                    rotateLog()
                }

                // Append encrypted log
                FileOutputStream(logFile, true).use { fos ->
                    fos.write("$encryptedEntry\n".toByteArray())
                }

                // Also log to Android logcat for development
                when (level) {
                    "INFO" -> Log.i(TAG, message)
                    "WARN" -> Log.w(TAG, message)
                    "ERROR" -> Log.e(TAG, message, exception)
                    else -> Log.d(TAG, message)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to write secure log", e)
            }
        }
    }

    /**
     * Rotates log file when it gets too large
     */
    private fun rotateLog() {
        try {
            val backupFile = File(context.filesDir, "$LOG_FILE_NAME.old")
            if (backupFile.exists()) {
                backupFile.delete()
            }
            logFile.renameTo(backupFile)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to rotate log file", e)
        }
    }

    /**
     * Retrieves encrypted logs (for debugging/reporting)
     */
    fun getEncryptedLogs(): String? {
        return try {
            if (logFile.exists()) {
                logFile.readText()
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read logs", e)
            null
        }
    }

    /**
     * Decrypts and returns logs (for local debugging only)
     */
    fun getDecryptedLogs(): String? {
        return try {
            val encryptedLogs = getEncryptedLogs() ?: return null
            val lines = encryptedLogs.split("\n")

            lines.joinToString("\n") { line ->
                if (line.isNotBlank()) {
                    try {
                        EncryptionUtils.decryptMetadata(line.trim())
                    } catch (e: Exception) {
                        "[DECRYPTION_ERROR] $line"
                    }
                } else {
                    ""
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decrypt logs", e)
            null
        }
    }

    /**
     * Clears old logs (cleanup)
     */
    fun clearOldLogs() {
        scope.launch {
            try {
                if (logFile.exists()) {
                    val ageMillis = System.currentTimeMillis() - logFile.lastModified()
                    val ageDays = ageMillis / (1000 * 60 * 60 * 24)

                    if (ageDays > MAX_LOG_AGE_DAYS) {
                        logFile.delete()
                        Log.d(TAG, "Cleared old logs (age: $ageDays days)")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to clear old logs", e)
            }
        }
    }

    /**
     * Exports logs for user reporting (encrypted)
     */
    fun exportLogsForReporting(): File? {
        return try {
            if (logFile.exists()) {
                val exportFile = File(context.cacheDir, "error_report_${System.currentTimeMillis()}.enc")
                logFile.copyTo(exportFile, overwrite = true)
                exportFile
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to export logs", e)
            null
        }
    }

    /**
     * Wipes all logs (for privacy/security)
     */
    fun wipeAllLogs() {
        try {
            if (logFile.exists()) {
                logFile.delete()
            }
            File(context.filesDir, "$LOG_FILE_NAME.old").delete()
            Log.d(TAG, "All logs wiped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to wipe logs", e)
        }
    }
}
