package com.aurex.android.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [SmsEntity::class],
    version = 4,
    exportSchema = true
)
abstract class AurexDatabase : RoomDatabase() {

    abstract fun smsDao(): SmsDao

    companion object {
        @Volatile
        private var INSTANCE: AurexDatabase? = null

        /**
         * Migration from version 1 to 2: Add basic sync tracking fields
         */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add sync tracking fields
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN sync_attempts INTEGER NOT NULL DEFAULT 0")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN last_sync_attempt INTEGER")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN server_id TEXT")
            }
        }

        /**
         * Migration from version 2 to 3: Add E2EE, tamper detection, conflict detection,
         * preprocessing, and comprehensive sync status tracking
         */
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Sync status tracking
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN next_retry_at INTEGER")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN sync_error_message TEXT")

                // Security & Encryption
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN is_encrypted INTEGER NOT NULL DEFAULT 1")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN encrypted_metadata INTEGER NOT NULL DEFAULT 1")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN content_hash TEXT")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN tamper_detected INTEGER NOT NULL DEFAULT 0")

                // Conflict detection
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN message_fingerprint TEXT NOT NULL DEFAULT ''")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN conflict_detected INTEGER NOT NULL DEFAULT 0")

                // AI Preprocessing
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN locally_preprocessed INTEGER NOT NULL DEFAULT 0")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN likely_financial INTEGER")

                // Versioning
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN app_version TEXT NOT NULL DEFAULT '1.0.0'")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 2")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0")

                // Create index on fingerprint for fast duplicate lookup
                database.execSQL("CREATE INDEX IF NOT EXISTS index_sms_messages_fingerprint ON sms_messages(message_fingerprint)")

                // Create index on sync_status for fast status queries
                database.execSQL("CREATE INDEX IF NOT EXISTS index_sms_messages_sync_status ON sms_messages(sync_status)")
            }
        }

        /**
         * Migration from version 1 to 3: Direct migration for new installs or major upgrades
         */
        private val MIGRATION_1_3 = object : Migration(1, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Apply both migrations in sequence
                MIGRATION_1_2.migrate(database)
                MIGRATION_2_3.migrate(database)
            }
        }

        /**
         * Migration from version 3 to 4: Add Dual SIM support
         */
        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add Dual SIM fields
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN sim_slot INTEGER")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN sim_subscription_id INTEGER")
                database.execSQL("ALTER TABLE sms_messages ADD COLUMN sim_carrier_name TEXT")

                // Create index on sim_slot for fast SIM-based queries
                database.execSQL("CREATE INDEX IF NOT EXISTS index_sms_messages_sim_slot ON sms_messages(sim_slot)")
            }
        }

        fun getDatabase(context: Context): AurexDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AurexDatabase::class.java,
                    "aurex_database"
                )
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_1_3, MIGRATION_3_4)
                    .fallbackToDestructiveMigration() // Last resort for development
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
