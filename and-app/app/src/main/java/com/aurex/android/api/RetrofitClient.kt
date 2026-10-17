package com.aurex.android.api

import android.util.Log
import okhttp3.CertificatePinner
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private const val TAG = "RetrofitClient"

    // TODO: Update this with your actual backend URL
    private const val BASE_URL = "https://api.aurex.com/"

    /**
     * Certificate Pins for api.aurex.com
     *
     * PRODUCTION DEPLOYMENT: Replace these placeholder pins with your actual backend certificate pins
     *
     * To generate real pins:
     * 1. Get your backend certificate:
     *    openssl s_client -connect api.aurex.com:443 -servername api.aurex.com < /dev/null \
     *      | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der \
     *      | openssl dgst -sha256 -binary | openssl enc -base64
     *
     * 2. Get backup pin (intermediate CA):
     *    openssl s_client -connect api.aurex.com:443 -showcerts < /dev/null 2>/dev/null \
     *      | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der \
     *      | openssl dgst -sha256 -binary | openssl enc -base64
     *
     * Pin Format: sha256/[base64-encoded-hash]
     */
    private val CERTIFICATE_PINS = arrayOf(
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", // Primary certificate pin (REPLACE)
        "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="  // Backup pin (REPLACE)
    )

    /**
     * Certificate Pinner Configuration
     * Prevents man-in-the-middle attacks by validating server certificates against known pins
     */
    private val certificatePinner = CertificatePinner.Builder()
        .add("api.aurex.com", *CERTIFICATE_PINS)
        .build()

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
     * OkHttp Client with Security Hardening
     * - Certificate pinning enabled
     * - Metrics tracking
     * - Connection retry on failure
     */
    private val okHttpClient = OkHttpClient.Builder()
        .certificatePinner(certificatePinner) // ✅ Certificate pinning
        .addInterceptor(metricsInterceptor)   // ✅ Metrics tracking
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
