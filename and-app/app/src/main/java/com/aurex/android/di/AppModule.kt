package com.aurex.android.di

import android.content.Context
import com.aurex.android.api.AurexApiService
import com.aurex.android.api.RetrofitClient
import com.aurex.android.database.AurexDatabase
import com.aurex.android.repository.SmsRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt Dependency Injection Module
 * Provides application-level singleton dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /**
     * Provides AurexDatabase instance
     * Room database singleton for SMS storage
     */
    @Provides
    @Singleton
    fun provideAurexDatabase(@ApplicationContext context: Context): AurexDatabase {
        return AurexDatabase.getDatabase(context)
    }

    /**
     * Provides SmsRepository instance
     * Repository for SMS CRUD operations
     */
    @Provides
    @Singleton
    fun provideSmsRepository(
        @ApplicationContext context: Context
    ): SmsRepository {
        return SmsRepository(context)
    }

    /**
     * Provides AurexApiService instance
     * Retrofit API service for backend communication
     */
    @Provides
    @Singleton
    fun provideAurexApiService(): AurexApiService {
        return RetrofitClient.apiService
    }
}
