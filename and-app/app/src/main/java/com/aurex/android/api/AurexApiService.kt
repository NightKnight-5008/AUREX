package com.aurex.android.api

import com.aurex.android.models.*
import retrofit2.Response
import retrofit2.http.*

interface AurexApiService {

    // ==================== AUTH ====================

    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @POST("api/auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<RegisterResponse>

    @GET("api/auth/me")
    suspend fun getCurrentUser(
        @Header("Authorization") authToken: String
    ): Response<User>

    // ==================== SEMI-ACCOUNTS ====================

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

    // ==================== CREDIT CARDS ====================

    @GET("api/credit-cards")
    suspend fun getCreditCards(
        @Header("Authorization") authToken: String
    ): Response<List<CreditCard>>

    @POST("api/credit-cards")
    suspend fun createCreditCard(
        @Header("Authorization") authToken: String,
        @Body request: CreditCard
    ): Response<CreditCard>

    @PUT("api/credit-cards/{id}")
    suspend fun updateCreditCard(
        @Header("Authorization") authToken: String,
        @Path("id") id: String,
        @Body request: CreditCard
    ): Response<CreditCard>

    @DELETE("api/credit-cards/{id}")
    suspend fun deleteCreditCard(
        @Header("Authorization") authToken: String,
        @Path("id") id: String
    ): Response<Void>

    // ==================== TRANSACTIONS ====================

    @GET("api/transactions")
    suspend fun getTransactions(
        @Header("Authorization") authToken: String
    ): Response<List<Transaction>>

    @POST("api/transactions")
    suspend fun createTransaction(
        @Header("Authorization") authToken: String,
        @Body request: Transaction
    ): Response<Transaction>

    // ==================== SMS ====================

    @POST("api/sms/sync")
    suspend fun syncSms(
        @Header("Authorization") authToken: String,
        @Body request: SmsSyncRequest
    ): Response<SmsSyncResponse>

    @GET("api/sms/logs")
    suspend fun getSmsLogs(
        @Header("Authorization") authToken: String
    ): Response<List<SmsLog>>

    // ==================== AI ====================

    @POST("api/ai/sms/classify")
    suspend fun classifySms(
        @Header("Authorization") authToken: String,
        @Body request: SmsClassifyRequest
    ): Response<SmsClassifyResponse>

    @POST("api/ai/analysis/financial")
    suspend fun getFinancialAnalysis(
        @Header("Authorization") authToken: String
    ): Response<FinancialAnalysisResponse>

    // ==================== SETTINGS ====================

    @GET("api/settings")
    suspend fun getSettings(
        @Header("Authorization") authToken: String
    ): Response<Settings>

    @PUT("api/settings")
    suspend fun updateSettings(
        @Header("Authorization") authToken: String,
        @Body request: Settings
    ): Response<Settings>

    // ==================== REMINDERS ====================

    @GET("api/reminders")
    suspend fun getReminders(
        @Header("Authorization") authToken: String
    ): Response<List<Reminder>>

    @POST("api/reminders")
    suspend fun createReminder(
        @Header("Authorization") authToken: String,
        @Body request: Reminder
    ): Response<Reminder>

    // ==================== SYNC ====================

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
