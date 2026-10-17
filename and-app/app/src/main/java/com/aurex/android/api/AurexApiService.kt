package com.aurex.android.api

import com.aurex.android.models.*
import retrofit2.Response
import retrofit2.http.*

interface AurexApiService {

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("api/semi-accounts")
    suspend fun getSemiAccounts(
        @Header("Authorization") authToken: String
    ): Response<SemiAccountListResponse>

    @POST("api/semi-accounts")
    suspend fun createSemiAccount(
        @Header("Authorization") authToken: String,
        @Body request: SemiAccountRequest
    ): Response<SemiAccountResponse>

    @PUT("api/semi-accounts/{id}")
    suspend fun updateSemiAccount(
        @Header("Authorization") authToken: String,
        @Path("id") id: String,
        @Body request: SemiAccountRequest
    ): Response<SemiAccountResponse>

    @DELETE("api/semi-accounts/{id}")
    suspend fun deleteSemiAccount(
        @Header("Authorization") authToken: String,
        @Path("id") id: String
    ): Response<SemiAccountResponse>

    @POST("api/sms/sync")
    suspend fun syncSms(
        @Header("Authorization") authToken: String,
        @Body request: SmsSyncRequest
    ): Response<SmsSyncResponse>

    @POST("api/sync/heartbeat")
    suspend fun sendSyncHeartbeat(
        @Header("Authorization") authToken: String,
        @Body request: SyncHeartbeatRequest
    ): Response<SyncHeartbeatResponse>

    @GET("api/sync/status")
    suspend fun getSyncStatus(
        @Header("Authorization") authToken: String
    ): Response<SyncStatusResponse>
}
