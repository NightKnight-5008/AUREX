# Android App Migration Guide - Legacy to Enterprise

## Overview

This guide covers the migration from the legacy user-based Android app to the enterprise workspace-based SMS ingestion agent.

---

## Key Changes Summary

| Aspect | Legacy | Enterprise |
|--------|--------|------------|
| **Authentication** | User login (email + password) | Device binding (workspace + token) |
| **Data Model** | `user_id` based | `workspace_id` + `device_id` based |
| **SMS Capture** | `SmsReceiver.kt` | `SmsReceiverEnterprise.kt` |
| **Sync Worker** | `SmsSyncWorker.kt` | `SmsSyncWorkerEnterprise.kt` |
| **Idempotency** | `messageFingerprint` | `smsHash` (SHA-256) |
| **Time Format** | Device local time | UTC + timezone offset |
| **Heartbeat** | Basic status | Full device health monitoring |
| **UI** | Multi-screen user app | Single diagnostic screen |

---

## Step 1: Update Database Schema

### 1.1 Add New Columns to `sms_messages` Table

```kotlin
// Migration v2 → v3
@Database(
    entities = [SmsEntity::class],
    version = 3,
    exportSchema = false
)
abstract class AurexDatabase : RoomDatabase() {

    companion object {
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("""
                    ALTER TABLE sms_messages
                    ADD COLUMN workspace_id TEXT DEFAULT ''
                """)

                database.execSQL("""
                    ALTER TABLE sms_messages
                    ADD COLUMN device_id TEXT DEFAULT ''
                """)

                database.execSQL("""
                    ALTER TABLE sms_messages
                    ADD COLUMN sms_hash TEXT DEFAULT ''
                """)

                database.execSQL("""
                    ALTER TABLE sms_messages
                    ADD COLUMN received_at_utc TEXT DEFAULT ''
                """)

                database.execSQL("""
                    ALTER TABLE sms_messages
                    ADD COLUMN device_timezone_offset INTEGER DEFAULT 0
                """)

                database.execSQL("""
                    ALTER TABLE sms_messages
                    ADD COLUMN device_locale TEXT DEFAULT ''
                """)
            }
        }

        @Volatile
        private var INSTANCE: AurexDatabase? = null

        fun getDatabase(context: Context): AurexDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AurexDatabase::class.java,
                    "aurex_database"
                )
                .addMigrations(MIGRATION_2_3) // Add migration
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

### 1.2 Update SmsDao Queries

**Add new method to find by sms_hash:**
```kotlin
@Dao
interface SmsDao {
    // ... existing methods ...

    @Query("SELECT * FROM sms_messages WHERE sms_hash = :smsHash LIMIT 1")
    suspend fun findBySmsHash(smsHash: String): SmsEntity?
}
```

**Update SmsRepository:**
```kotlin
suspend fun findBySmsHash(smsHash: String): SmsEntity? = withContext(Dispatchers.IO) {
    smsDao.findBySmsHash(smsHash)
}
```

---

## Step 2: Update AndroidManifest.xml

### 2.1 Replace SmsReceiver with SmsReceiverEnterprise

```xml
<!-- OLD: Remove this -->
<!--
<receiver android:name=".receivers.SmsReceiver"
    android:permission="android.permission.BROADCAST_SMS"
    android:exported="true">
    <intent-filter android:priority="999">
        <action android:name="android.provider.Telephony.SMS_RECEIVED" />
    </intent-filter>
</receiver>
-->

<!-- NEW: Add this -->
<receiver android:name=".receivers.SmsReceiverEnterprise"
    android:permission="android.permission.BROADCAST_SMS"
    android:exported="true">
    <intent-filter android:priority="999">
        <action android:name="android.provider.Telephony.SMS_RECEIVED" />
    </intent-filter>
</receiver>
```

### 2.2 Update Services

```xml
<!-- OLD: Remove this -->
<!--
<service android:name=".services.SyncHeartbeatService"
    android:foregroundServiceType="dataSync"
    android:exported="false" />
-->

<!-- NEW: Add this -->
<service android:name=".services.HeartbeatServiceEnterprise"
    android:foregroundServiceType="dataSync"
    android:exported="false" />
```

### 2.3 Update Main Activity Launcher

```xml
<!-- OLD: LoginActivity or MainActivity -->
<!--
<activity android:name=".ui.LoginActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>
-->

<!-- NEW: WorkspaceSetupActivity (if not bound) or DiagnosticActivity -->
<activity android:name=".ui.WorkspaceSetupActivity"
    android:exported="true">
    <!-- Launcher intent filter moved to Application logic -->
</activity>

<activity android:name=".ui.DiagnosticActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>
```

### 2.4 Add Battery Optimization Permission (Optional but Recommended)

```xml
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

---

## Step 3: Update Application Entry Point

### 3.1 Modify AurexApplication.kt

**OLD:**
```kotlin
class AurexApplication : Application() {
    companion object {
        lateinit var preferenceManager: PreferenceManager
    }

    override fun onCreate() {
        super.onCreate()
        preferenceManager = PreferenceManager(this)
    }
}
```

**NEW:**
```kotlin
class AurexApplication : Application() {
    companion object {
        lateinit var preferenceManager: PreferenceManager
    }

    override fun onCreate() {
        super.onCreate()
        preferenceManager = PreferenceManager(this)

        // Check workspace binding on app start
        if (!preferenceManager.isWorkspaceBound()) {
            // Launch WorkspaceSetupActivity
            val intent = Intent(this, WorkspaceSetupActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
        }
    }
}
```

---

## Step 4: Backend API Updates

### 4.1 Add New Endpoints

**Required Backend Endpoints:**

1. **Device Verification**
```http
POST /api/android/verify-device
Content-Type: application/json

Request:
{
  "workspaceUsername": "acme-corp",
  "deviceToken": "verify_abc123...",
  "deviceId": "dev_uuid",
  "deviceName": "Samsung Galaxy S21",
  "appVersion": "2.0.0"
}

Response:
{
  "success": true,
  "workspaceId": "ws_123",
  "deviceAuthToken": "dev_token_xyz..."
}
```

2. **Enterprise SMS Sync**
```http
POST /api/android/sync-sms-enterprise
Authorization: Bearer {deviceAuthToken}
Content-Type: application/json

Request:
{
  "workspaceId": "ws_123",
  "deviceId": "dev_uuid",
  "smsHash": "a1b2c3d4...",
  "sender": "+1234567890",
  "content": "Your card ending 1234 was charged $45.67",
  "receivedAtUtc": "2025-02-11T08:30:00.000Z",
  "deviceTimezoneOffset": -300,
  "deviceLocale": "en_US",
  "phoneNumber": "+19876543210",
  "likelyFinancial": true
}

Response:
{
  "success": true,
  "serverId": "sms_abc123",
  "duplicate": false
}
```

3. **Enhanced Heartbeat**
```http
POST /api/android/heartbeat
Authorization: Bearer {deviceAuthToken}
Content-Type: application/json

Request:
{
  "workspaceId": "ws_123",
  "deviceId": "dev_uuid",
  "batteryLevel": 85,
  "batteryCharging": true,
  "networkStatus": "wifi",
  "lastSmsForwardedAt": 1707654321000,
  "localQueueSize": 3,
  "appVersion": "2.0.0",
  "androidVersion": "Android 13 (API 33)",
  "timestamp": 1707654400000
}

Response:
{
  "success": true,
  "serverTime": 1707654400123
}
```

### 4.2 Update AurexApiService.kt

```kotlin
interface AurexApiService {
    // Legacy endpoints (keep for backward compatibility)
    @POST("/api/android/sync-sms")
    suspend fun syncSms(
        @Header("Authorization") authToken: String,
        @Body request: SmsSyncRequest
    ): Response<SmsSyncResponse>

    // NEW: Enterprise endpoints
    @POST("/api/android/verify-device")
    suspend fun verifyDeviceWorkspace(
        @Body request: WorkspaceVerificationRequest
    ): Response<WorkspaceVerificationResponse>

    @POST("/api/android/sync-sms-enterprise")
    suspend fun syncSmsEnterprise(
        @Header("Authorization") authToken: String,
        @Body request: SmsSyncRequestEnterprise
    ): Response<SmsSyncResponseEnterprise>

    @POST("/api/android/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") authToken: String,
        @Body request: HeartbeatRequest
    ): Response<HeartbeatResponse>
}
```

---

## Step 5: Update Gradle Dependencies

### 5.1 Update build.gradle (Module: app)

```gradle
dependencies {
    // ... existing dependencies ...

    // Room (update to latest)
    def room_version = "2.6.1"
    implementation "androidx.room:room-runtime:$room_version"
    implementation "androidx.room:room-ktx:$room_version"
    kapt "androidx.room:room-compiler:$room_version"

    // WorkManager (ensure latest)
    implementation "androidx.work:work-runtime-ktx:2.9.0"

    // Coroutines (ensure latest)
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"

    // Lifecycle (ensure latest)
    implementation "androidx.lifecycle:lifecycle-runtime-ktx:2.7.0"
}
```

---

## Step 6: Test Migration Scenarios

### 6.1 Fresh Install (New Device)

**Test Flow:**
1. Install app on device
2. App launches WorkspaceSetupActivity
3. Enter workspace_username + device_token
4. Verify device binding succeeds
5. Navigate to DiagnosticActivity
6. Send test SMS
7. Verify SMS appears in pending queue
8. Verify SMS syncs to backend
9. Verify heartbeat starts (check notification)

**Expected Result:** Device successfully bound, SMS forwarding works.

---

### 6.2 Upgrade from Legacy App

**Test Flow:**
1. Install legacy app (v1.x)
2. Login with user account
3. Send test SMS (verify it syncs to legacy endpoint)
4. Upgrade to enterprise app (v2.0)
5. App launches WorkspaceSetupActivity (forced re-verification)
6. Enter workspace_username + device_token
7. Verify device binding succeeds
8. Verify existing SMS data migrated to v3 schema
9. Send new test SMS
10. Verify new SMS uses enterprise endpoint

**Expected Result:** Smooth upgrade, no data loss, new SMS use enterprise flow.

---

### 6.3 Network Interruption

**Test Flow:**
1. Send SMS while connected to WiFi
2. Verify SMS queued (pending status)
3. Disable WiFi and mobile data
4. Verify DiagnosticActivity shows "Disconnected"
5. Verify pending queue size increases
6. Re-enable WiFi
7. Verify SMS syncs automatically (exponential backoff)
8. Verify DiagnosticActivity shows "Connected"

**Expected Result:** No SMS lost, automatic retry on reconnect.

---

### 6.4 Battery Optimization

**Test Flow:**
1. Enable battery optimization for app (Settings → Battery → Optimize)
2. Lock device (Doze mode)
3. Send SMS to device
4. Wait 10 minutes
5. Unlock device
6. Verify DiagnosticActivity shows battery warning
7. Verify SMS eventually syncs (may be delayed)
8. Disable battery optimization
9. Verify warning disappears

**Expected Result:** Battery warning visible, SMS still syncs (with delay).

---

## Step 7: Rollout Strategy

### 7.1 Phased Rollout

**Phase 1: Internal Testing (10%)**
- Deploy to internal test devices only
- Monitor crash logs and sync errors
- Verify heartbeat data appears in backend
- Duration: 1 week

**Phase 2: Beta Release (50%)**
- Deploy to 50% of devices via staged rollout
- Monitor error rates vs legacy app
- Compare sync success rates
- Duration: 2 weeks

**Phase 3: Full Rollout (100%)**
- Deploy to all devices
- Legacy app endpoints remain functional for 6 months
- Gradual deprecation of legacy code

---

### 7.2 Rollback Plan

**If critical issues detected:**
1. Pause rollout immediately
2. Revert to legacy app (v1.x) via APK downgrade
3. Investigate root cause
4. Fix and re-test
5. Resume rollout

**Critical Issues Defined:**
- SMS data loss (>1%)
- Sync failure rate (>5%)
- App crashes (>2%)
- Battery drain (>10% per 24h)

---

## Step 8: Backend Migration Tasks

### 8.1 Database Schema Updates

**Add device binding table:**
```sql
CREATE TABLE android_devices (
    device_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_token_hash VARCHAR(255) NOT NULL,
    device_auth_token VARCHAR(255) NOT NULL,
    app_version VARCHAR(50),
    android_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX idx_workspace_devices ON android_devices(workspace_id);
CREATE INDEX idx_device_token ON android_devices(device_token_hash);
```

**Add SMS deduplication index:**
```sql
CREATE INDEX idx_sms_hash ON sms_messages(sms_hash);
```

**Add device health monitoring table:**
```sql
CREATE TABLE device_health_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    battery_level INTEGER,
    battery_charging BOOLEAN,
    network_status VARCHAR(50),
    local_queue_size INTEGER,
    app_version VARCHAR(50),
    android_version VARCHAR(50),
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (device_id) REFERENCES android_devices(device_id)
);

CREATE INDEX idx_device_health ON device_health_logs(device_id, timestamp DESC);
```

---

### 8.2 Backend API Implementation

**Required Backend Changes:**

1. **Device Verification Endpoint**
   - Validate workspace_username exists
   - Verify device_token matches workspace
   - Generate device_auth_token (JWT with device_id + workspace_id claims)
   - Store device binding in database
   - Return device_auth_token

2. **Enterprise SMS Sync Endpoint**
   - Authenticate via device_auth_token
   - Verify workspace_id matches token claim
   - Check sms_hash for duplicates (reject if exists)
   - Store SMS with workspace_id + device_id
   - Return serverId (or sms_hash)

3. **Heartbeat Endpoint**
   - Authenticate via device_auth_token
   - Update device last_seen_at timestamp
   - Store device health metrics
   - Trigger alerts if device offline >15 minutes

---

## Step 9: Desktop Dashboard Updates

### 9.1 Device Management UI

**Add to workspace settings:**
```
┌─────────────────────────────────────────────┐
│ SMS Ingestion Devices                       │
├─────────────────────────────────────────────┤
│ Device Name          Status     Last Seen   │
│ Samsung Galaxy S21   Online     2 min ago   │
│ Google Pixel 7       Offline    3 hours ago │
│                                              │
│ [+ Add Device]                              │
└─────────────────────────────────────────────┘
```

**Device Details Modal:**
```
┌─────────────────────────────────────────────┐
│ Samsung Galaxy S21                          │
├─────────────────────────────────────────────┤
│ Device ID: dev_abc123...                    │
│ App Version: 2.0.0                          │
│ Android Version: Android 13 (API 33)        │
│                                              │
│ Status: ✓ Online                            │
│ Last Seen: 2 minutes ago                    │
│ Battery: 85% (Charging)                     │
│ Network: WiFi                               │
│ Pending Queue: 3 SMS                        │
│                                              │
│ Last SMS Forwarded: Jan 10, 2025 15:32     │
│                                              │
│ [Generate Device Token] [Revoke Access]    │
└─────────────────────────────────────────────┘
```

---

### 9.2 Device Token Generation

**Workspace Admin Flow:**
1. Navigate to workspace settings → Devices
2. Click "Add Device"
3. System generates secure device_token (64-char random)
4. Display token in modal (copy-paste):
   ```
   verify_abc123def456...xyz789
   ```
5. User copies token and enters in Android app
6. Token valid for 24 hours (expires if unused)

---

## Step 10: Monitoring & Alerts

### 10.1 Device Health Monitoring

**Dashboard Metrics:**
- Total devices online/offline
- Average battery level
- Network distribution (WiFi vs Cellular)
- Average queue size
- Sync success rate

**Alerts:**
- Device offline >15 minutes → Email notification
- Queue size >50 SMS → Sync failure alert
- Battery <10% → Low battery warning

---

### 10.2 SMS Sync Monitoring

**Metrics:**
- SMS received (per device, per workspace)
- SMS synced successfully
- SMS pending (queue size)
- SMS failed (max retries exceeded)
- Duplicate SMS rejected

**Alerts:**
- Sync failure rate >5% → Investigation required
- Queue buildup (>100 SMS pending) → Backend issue

---

## Troubleshooting

### Issue 1: SMS Not Syncing

**Symptoms:** SMS appears in pending queue but never syncs.

**Diagnosis:**
1. Check DiagnosticActivity → Connection Status
2. Verify network connectivity
3. Check device token validity (may have expired)
4. Review sync error message in database

**Solution:**
- If "Disconnected": Re-verify device binding
- If network issue: Wait for auto-retry
- If token expired: Generate new token, re-verify

---

### Issue 2: Duplicate SMS in Backend

**Symptoms:** Same SMS appears multiple times in database.

**Diagnosis:**
1. Check if sms_hash is identical
2. Verify backend deduplication logic
3. Check if Android retrying after successful sync

**Solution:**
- Ensure backend checks sms_hash before insert
- Ensure Android marks SMS as synced only after backend ACK
- Add unique constraint on sms_hash in database

---

### Issue 3: Battery Drain

**Symptoms:** App using excessive battery (>10% per 24h).

**Diagnosis:**
1. Check heartbeat frequency (should be 5 minutes)
2. Verify WorkManager constraints (requires network)
3. Check for wake lock usage (should be none)

**Solution:**
- Reduce heartbeat frequency if needed (10 minutes)
- Ensure Doze mode compatibility
- Disable any wake locks

---

## Rollback Procedure

**If enterprise app must be rolled back:**

1. **Immediate Actions:**
   - Pause rollout in Play Console
   - Deploy legacy app (v1.x) to all devices
   - Notify users of rollback

2. **Backend Changes:**
   - Ensure legacy endpoints still functional
   - Route legacy devices to old sync flow
   - Preserve enterprise data (do not delete)

3. **Investigation:**
   - Review crash logs (Firebase Crashlytics)
   - Analyze sync failure rates
   - Check device health metrics

4. **Fix and Re-deploy:**
   - Fix identified issues
   - Re-test migration scenarios
   - Resume rollout (start at Phase 1)

---

## Final Checklist

- [ ] Database migration v2 → v3 tested
- [ ] SmsReceiverEnterprise registered in manifest
- [ ] HeartbeatServiceEnterprise registered in manifest
- [ ] Backend endpoints implemented and tested
- [ ] Device token generation UI added to dashboard
- [ ] Desktop dashboard shows device health monitoring
- [ ] Fresh install tested (new device)
- [ ] Upgrade tested (legacy app → enterprise app)
- [ ] Network interruption tested (auto-retry works)
- [ ] Battery optimization tested (warning visible)
- [ ] Rollback plan documented and tested

---

**Migration Complete ✅**

**Enterprise-grade SMS ingestion agent ready for deployment.**
