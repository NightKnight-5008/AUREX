package com.aurex.android.observability

import android.content.Context
import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics
import timber.log.Timber
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Centralized Observability System for AUREX Android
 *
 * Provides:
 * - Structured logging via Timber
 * - Error tracking via Firebase Crashlytics
 * - In-memory metrics aggregation
 * - User context for debugging
 *
 * Usage:
 *   ObservabilityManager.init(context)
 *   ObservabilityManager.logEvent("user_login", mapOf("method" to "google"))
 *   ObservabilityManager.recordMetric("sync_duration_ms", 1234.0)
 *   ObservabilityManager.recordError("network_error", exception)
 */
object ObservabilityManager {

    private const val TAG = "ObservabilityManager"
    private var isInitialized = false
    private lateinit var crashlytics: FirebaseCrashlytics

    // In-memory metrics storage
    private val metrics = ConcurrentHashMap<String, MetricData>()

    /**
     * Initialize observability system
     * Must be called in Application.onCreate()
     */
    fun init(context: Context) {
        if (isInitialized) {
            Timber.w("ObservabilityManager already initialized")
            return
        }

        // Initialize Timber with custom log tree
        Timber.plant(AurexDebugTree())

        // Initialize Firebase Crashlytics
        crashlytics = FirebaseCrashlytics.getInstance()
        crashlytics.setCrashlyticsCollectionEnabled(true)

        isInitialized = true
        Timber.i("ObservabilityManager initialized")
    }

    /**
     * Log an event with optional attributes
     *
     * @param eventName Name of the event (e.g., "user_login", "sms_synced")
     * @param attributes Key-value pairs for event context
     */
    fun logEvent(eventName: String, attributes: Map<String, String> = emptyMap()) {
        if (!isInitialized) {
            Log.w(TAG, "ObservabilityManager not initialized - call init() first")
            return
        }

        val attributesStr = if (attributes.isNotEmpty()) {
            attributes.entries.joinToString(", ") { "${it.key}=${it.value}" }
        } else {
            "no attributes"
        }

        Timber.i("Event: $eventName | $attributesStr")

        // Set custom keys in Crashlytics for debugging
        attributes.forEach { (key, value) ->
            crashlytics.setCustomKey(key, value)
        }
    }

    /**
     * Record a metric value
     *
     * @param metricName Name of the metric (e.g., "sync_duration_ms", "api_latency_ms")
     * @param value Numeric value to record
     * @param tags Optional tags for metric filtering (e.g., "endpoint" to "sync")
     */
    fun recordMetric(metricName: String, value: Double, tags: Map<String, String> = emptyMap()) {
        if (!isInitialized) {
            Log.w(TAG, "ObservabilityManager not initialized - call init() first")
            return
        }

        val key = if (tags.isNotEmpty()) {
            "$metricName:${tags.entries.joinToString(",") { "${it.key}=${it.value}" }}"
        } else {
            metricName
        }

        // Update or create metric entry
        metrics.compute(key) { _, existing ->
            if (existing == null) {
                MetricData(
                    name = metricName,
                    tags = tags,
                    count = 1,
                    sum = value,
                    min = value,
                    max = value,
                    lastValue = value,
                    lastUpdated = System.currentTimeMillis()
                )
            } else {
                existing.copy(
                    count = existing.count + 1,
                    sum = existing.sum + value,
                    min = minOf(existing.min, value),
                    max = maxOf(existing.max, value),
                    lastValue = value,
                    lastUpdated = System.currentTimeMillis()
                )
            }
        }

        Timber.d("Metric: $metricName = $value ${if (tags.isNotEmpty()) "| $tags" else ""}")
    }

    /**
     * Record an error with context
     *
     * @param errorType Type of error (e.g., "network_error", "sync_failure")
     * @param throwable Exception or error
     * @param context Additional context for debugging
     */
    fun recordError(errorType: String, throwable: Throwable, context: Map<String, String> = emptyMap()) {
        if (!isInitialized) {
            Log.e(TAG, "ObservabilityManager not initialized - call init() first", throwable)
            return
        }

        Timber.e(throwable, "Error: $errorType | Context: $context")

        // Set custom keys for error context
        crashlytics.setCustomKey("error_type", errorType)
        context.forEach { (key, value) ->
            crashlytics.setCustomKey(key, value)
        }

        // Report to Crashlytics
        crashlytics.recordException(throwable)

        // Increment error metric
        recordMetric("errors_total", 1.0, mapOf("type" to errorType))
    }

    /**
     * Set user identifier for debugging
     * Call this after successful login
     */
    fun setUserId(userId: String) {
        if (!isInitialized) {
            Log.w(TAG, "ObservabilityManager not initialized - call init() first")
            return
        }

        crashlytics.setUserId(userId)
        Timber.i("User context set: $userId")
    }

    /**
     * Set custom key-value pairs for debugging
     * Useful for device-specific context
     */
    fun setCustomKey(key: String, value: String) {
        if (!isInitialized) {
            Log.w(TAG, "ObservabilityManager not initialized - call init() first")
            return
        }

        crashlytics.setCustomKey(key, value)
    }

    /**
     * Get snapshot of all metrics
     * Used for debugging and monitoring dashboards
     */
    fun getMetricsSnapshot(): List<MetricData> {
        return metrics.values.toList()
    }

    /**
     * Get specific metric by name
     */
    fun getMetric(metricName: String): MetricData? {
        return metrics[metricName]
    }

    /**
     * Clear all metrics (useful for testing)
     */
    fun clearMetrics() {
        metrics.clear()
        Timber.d("All metrics cleared")
    }

    /**
     * Force a test crash (for testing Crashlytics integration)
     * DO NOT call in production code
     */
    fun forceCrash() {
        Timber.w("Forcing test crash")
        throw RuntimeException("Test crash from ObservabilityManager")
    }

    /**
     * Custom Timber tree with AUREX-specific formatting
     */
    private class AurexDebugTree : Timber.DebugTree() {
        override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
            // Add AUREX prefix for easy filtering in logcat
            super.log(priority, "AUREX:$tag", message, t)
        }

        override fun createStackElementTag(element: StackTraceElement): String {
            // Include line number for easier debugging
            return "${super.createStackElementTag(element)}:${element.lineNumber}"
        }
    }
}

/**
 * Data class for storing metric statistics
 */
data class MetricData(
    val name: String,
    val tags: Map<String, String> = emptyMap(),
    val count: Long,
    val sum: Double,
    val min: Double,
    val max: Double,
    val lastValue: Double,
    val lastUpdated: Long
) {
    val average: Double
        get() = if (count > 0) sum / count else 0.0

    override fun toString(): String {
        return "$name: count=$count, avg=${String.format("%.2f", average)}, " +
                "min=${String.format("%.2f", min)}, max=${String.format("%.2f", max)}, " +
                "last=${String.format("%.2f", lastValue)}"
    }
}
