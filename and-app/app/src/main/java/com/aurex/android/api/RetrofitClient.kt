package com.aurex.android.api

import android.util.Log
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val TAG = "RetrofitClient"

    // Local development backend
    private const val BASE_URL = "http://localhost:3001/"

    /**
     * Metrics Interceptor
     * Tracks network request metrics for observability
     */
    private val metricsInterceptor = Interceptor { chain ->
        val request = chain.request()
        val startTime = System.currentTimeMillis()

        try {
            val response = chain.proceed(request)
            val duration = System.currentTimeMillis() - startTime

            // Record metrics via ObservabilityManager
            try {
                com.aurex.android.observability.ObservabilityManager.recordMetric(
                    "api_request_duration_ms",
                    duration.toDouble(),
                    mapOf(
                        "endpoint" to request.url.encodedPath,
                        "method" to request.method,
                        "status" to response.code.toString()
                    )
                )
            } catch (e: Exception) {
                // Fallback to Log if ObservabilityManager not initialized
                Log.d(TAG, "Request: ${request.method} ${request.url.encodedPath} - ${response.code} (${duration}ms)")
            }

            response
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime

            // Record error via ObservabilityManager
            try {
                com.aurex.android.observability.ObservabilityManager.recordError(
                    "api_request_failed",
                    e,
                    mapOf(
                        "endpoint" to request.url.encodedPath,
                        "method" to request.method,
                        "duration_ms" to duration.toString()
                    )
                )
            } catch (observabilityError: Exception) {
                // Fallback to Log
                Log.e(TAG, "Request failed: ${request.method} ${request.url.encodedPath} (${duration}ms)", e)
            }

            throw e
        }
    }

    /**
     * Logging Interceptor
     * Detailed HTTP logging for debugging (disabled in production builds)
     */
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    /**
     * OkHttp Client
     * - Metrics tracking
     * - Connection retry on failure
     * - No certificate pinning (local dev)
     */
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(metricsInterceptor)   // Metrics tracking
        .addInterceptor(loggingInterceptor)   // HTTP logging
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)        // Retry on transient failures
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: AurexApiService = retrofit.create(AurexApiService::class.java)
}
