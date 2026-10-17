# AUREX Android SMS Ingestion Agent - Enterprise Architecture

## Executive Summary

The AUREX Android app is an **infrastructure component**, not a consumer application. Its sole purpose is to securely receive SMS messages on a device and forward them to the backend database for financial card analytics.

**What it IS:**
- A data ingestion node
- An enterprise background service
- A secure SMS forwarding agent

**What it is NOT:**
- A user-facing product
- A dashboard or analytics tool
- A multi-user RBAC system

---

## 1. Core Architecture

### 1.1 Device-to-Workspace Binding (NON-NEGOTIABLE)

```
Device <--[Verification Token]--> Workspace
   |
   └─> LOCKED after verification
   └─> NO workspace switching
   └─> NO workspace discovery
```

**Authentication Model:**
- Device authenticates as a **device**, not a user
- Each device has a unique `device_id` (UUID)
- Device verification requires:
  - `workspace_username`
  - `device_token` (secure pairing code)
- Once bound, device is **locked** to that workspace

**Key Files:**
- `WorkspaceSetupActivity.kt` - First-launch device binding
- `PreferenceManager.kt` - Workspace binding storage (LOCKED)

---

## 2. SMS Ingestion Pipeline

### 2.1 Real-Time Capture

```
SMS Received → SmsReceiverEnterprise → Local Queue (Room) → SmsSyncWorkerEnterprise → Backend
```

**Flow:**
1. `BroadcastReceiver` captures incoming SMS immediately
2. Financial classification (OTP/marketing rejected)
3. E2EE encryption
4. Insert into local queue (PENDING status)
5. Trigger immediate sync worker

**Key Files:**
- `SmsReceiverEnterprise.kt` - Real-time SMS capture
- `SmsEntity.kt` - Database schema with workspace binding

---

### 2.2 Guaranteed Delivery Queue

**Local Queue (Room SQLite):**
```sql
CREATE TABLE sms_messages (
    id INTEGER PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    sms_hash TEXT NOT NULL,        -- SHA-256(sender + utc + content)
    sender TEXT,
    content TEXT,                   -- E2EE encrypted
    received_at_utc TEXT NOT NULL,  -- ISO 8601 UTC
    device_timezone_offset INTEGER,
    device_locale TEXT,
    sync_status TEXT,               -- pending, retrying, synced, failed
    sync_attempts INTEGER DEFAULT 0,
    next_retry_at INTEGER,
    ...
)
```

**Sync Status States:**
- `pending` - Queued for first attempt
- `retrying` - Failed, scheduled for retry
- `synced` - Successfully delivered to backend
- `failed` - Max retries exceeded (manual intervention required)
- `conflict` - Duplicate detected (needs resolution)

**No SMS may be dropped silently.**

---

### 2.3 Exponential Backoff Retry

**Formula (NON-NEGOTIABLE):**
```
Delay = BaseDelay × (2 ^ retry_attempt)
Where BaseDelay = 5 seconds
```

**Example Schedule:**
- Attempt 0: 5s
- Attempt 1: 10s
- Attempt 2: 20s
- Attempt 3: 40s
- Attempt 4: 80s
- Max: 300s (5 minutes)

**Implementation:**
```kotlin
private fun calculateExponentialBackoff(attempts: Int): Long {
    val exponentialDelay = (BASE_BACKOFF_SEC * 2.0.pow(attempts.toDouble())).toLong()
    return min(exponentialDelay, MAX_BACKOFF_SEC)
}
```

**Key Files:**
- `SmsSyncWorkerEnterprise.kt` - Guaranteed delivery with backoff

---

## 3. Idempotency & De-Duplication

### 3.1 SMS Hash Generation

**Formula:**
```
sms_hash = SHA-256(sender | received_at_utc | content)
```

**Purpose:**
- Backend uses same hash to reject duplicates
- Android resends until acknowledged (idempotent)
- Prevents duplicate transactions in financial data

**Implementation:**
```kotlin
private fun generateSmsHash(sender: String, receivedAtUtc: String, content: String): String {
    val input = "$sender|$receivedAtUtc|$content"
    val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
    return bytes.joinToString("") { "%02x".format(it) }
}
```

**Duplicate Detection:**
1. Local check before insert (via `sms_hash`)
2. Backend check on receive (reject duplicates)
3. Android marks as `synced` only after backend ACK

---

## 4. Time & Locale Normalization

### 4.1 UTC Time Conversion

**Problem:** Financial data requires precise timestamps across timezones.

**Solution:**
```kotlin
// Convert device timestamp to UTC ISO 8601
val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
dateFormat.timeZone = TimeZone.getTimeZone("UTC")
val receivedAtUtc = dateFormat.format(Date(timestampMillis))

// Calculate timezone offset in minutes
val timezoneOffset = TimeZone.getDefault().getOffset(timestampMillis) / (1000 * 60)

// Get device locale
val deviceLocale = Locale.getDefault().toString() // e.g. "en_US"
```

**Sent to Backend:**
- `received_at_utc` - ISO 8601 UTC timestamp
- `device_timezone_offset` - Minutes from UTC
- `device_locale` - Device locale string

**This prevents financial data misalignment.**

---

## 5. Secure Device Authentication

### 5.1 Device Token Authentication

**Flow:**
```
1. User inputs workspace_username + device_token
2. Android sends verification request
3. Backend validates token + returns device_auth_token
4. Android stores device_auth_token (used for all API calls)
5. Token is tied to device_id + workspace_id
```

**Security Requirements:**
- HTTPS only (TLS 1.2+)
- Device token is **never** stored in code
- Device auth token rotates on re-verification
- No hardcoded credentials

**API Authentication:**
```kotlin
val response = RetrofitClient.apiService.syncSmsEnterprise(
    authToken = "Bearer $deviceToken",
    request = request
)
```

**If authentication fails:**
- Queue SMS locally
- Show "Disconnected" status in UI
- NO silent data loss

---

## 6. Health & Heartbeat Monitoring

### 6.1 Heartbeat Payload (Every 5 Minutes)

**Sent to Backend:**
```json
{
  "workspace_id": "ws_123",
  "device_id": "dev_abc",
  "battery_level": 85,
  "battery_charging": true,
  "network_status": "wifi",
  "last_sms_forwarded_at": 1707654321000,
  "local_queue_size": 3,
  "app_version": "2.0.0",
  "android_version": "Android 13 (API 33)",
  "timestamp": 1707654400000
}
```

**Purpose:**
- Desktop dashboard shows device health
- Alerts if device offline for >15 minutes
- Monitors queue buildup (indicates sync issues)
- Tracks battery optimization restrictions

**Key Files:**
- `HeartbeatServiceEnterprise.kt` - 5-minute heartbeat loop

---

## 7. Failure Visibility (Minimal UI)

### 7.1 Diagnostic Status Screen

**DiagnosticActivity.kt** shows:

```
┌─────────────────────────────────────┐
│ Connection Status: ✓ Connected      │
│ Workspace: acme-corp                │
│ Last SMS Forwarded: Jan 10, 15:32   │
│ Pending Queue: 3 SMS                │
│                                      │
│ ⚠ Battery optimization enabled      │
│ SMS Permissions: ✓ Granted           │
│                                      │
│ [Force Sync] [View Logs]            │
└─────────────────────────────────────┘
```

**Features:**
- Connection status (Connected / Disconnected)
- Workspace username (read-only)
- Last SMS forwarded timestamp
- Pending queue size
- Battery optimization warning
- SMS permission status
- Manual "Force Sync" button
- Read-only logs (last 50 SMS)

**Design Philosophy:**
- NO animations
- NO charts
- NO dashboards
- Clarity > aesthetics
- Infrastructure-grade

**Key Files:**
- `DiagnosticActivity.kt` - Status screen

---

## 8. Permission & OS Resilience

### 8.1 Critical Permissions

**Required:**
- `RECEIVE_SMS` - Real-time SMS capture
- `READ_SMS` - SMS content access
- `READ_PHONE_STATE` - Device phone number
- `INTERNET` - Backend sync
- `ACCESS_NETWORK_STATE` - Network status monitoring

**Battery Optimization:**
- Detect if battery optimization is enabled
- Warn user clearly (blocks background SMS)
- Provide link to system settings

**Background Execution:**
- Use `WorkManager` for retries (respects Doze mode)
- Use foreground service for heartbeat (visible notification)
- Avoid wake locks (battery discipline)

**Permission Revocation:**
- Detect SMS permission revocation
- Show "SMS Permissions: ✗ DENIED" in status
- Do NOT silently fail

---

## 9. Data Pre-Processing (Optional)

### 9.1 Lightweight Extraction

**Before sending to backend, attempt to extract:**
- Detected amount (if obvious, e.g. "$45.67")
- Detected card last 4 digits (e.g. "1234")
- Detected bank name (e.g. "Chase")
- Message type guess:
  - `payment` - Withdrawal/purchase
  - `purchase` - Specific merchant transaction
  - `fee` - Bank fee/charge
  - `otp` - One-time password (rejected)
  - `unknown` - Unclassified

**Backend will re-validate.**

**Key Files:**
- `SmsPreprocessor.kt` - Financial classification

---

## 10. What MUST NOT Be Added (Forbidden)

**Explicitly FORBIDDEN:**
- ❌ User accounts (device-based auth only)
- ❌ Multi-role UI (no admin/viewer/editor)
- ❌ Workspace switching (device locked to one workspace)
- ❌ Approval flows (not a client app)
- ❌ Analytics dashboards (data ingestion only)
- ❌ Animations for aesthetics (infrastructure-grade)
- ❌ Any desktop feature replication

**This app is a data ingestion node, not a client app.**

---

## 11. File Structure

```
com.aurex.android/
├── ui/
│   ├── WorkspaceSetupActivity.kt         # First-launch device binding
│   ├── DiagnosticActivity.kt             # Status screen (minimal)
│   └── SmsLogsActivity.kt                # Read-only log viewer
├── receivers/
│   ├── SmsReceiverEnterprise.kt          # Real-time SMS capture
│   ├── SmsSyncWorkerEnterprise.kt        # Guaranteed delivery worker
│   └── BootReceiver.kt                   # Start on device boot
├── services/
│   └── HeartbeatServiceEnterprise.kt     # 5-minute health monitoring
├── database/
│   ├── SmsEntity.kt                      # Database schema (v3)
│   ├── SmsDao.kt                         # Database queries
│   └── AurexDatabase.kt                  # Room database
├── repository/
│   └── SmsRepository.kt                  # Data access layer
├── models/
│   └── EnterpriseModels.kt               # API request/response models
├── utils/
│   ├── PreferenceManager.kt              # Workspace binding storage
│   ├── EncryptionUtils.kt                # E2EE encryption
│   ├── SmsPreprocessor.kt                # Financial classification
│   └── SecureLogger.kt                   # Audit logging
└── api/
    ├── AurexApiService.kt                # API interface
    └── RetrofitClient.kt                 # HTTP client
```

---

## 12. Database Schema (v3)

**sms_messages Table:**
```kotlin
@Entity(tableName = "sms_messages")
data class SmsEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    // WORKSPACE & DEVICE BINDING
    val workspaceId: String,
    val deviceId: String,

    // SMS CONTENT (E2EE)
    val sender: String,                  // Encrypted
    val content: String,                 // Encrypted
    val smsHash: String,                 // SHA-256(sender + utc + content)

    // TIME & LOCALE NORMALIZATION
    val receivedAt: Long,                // Device timestamp (millis)
    val receivedAtUtc: String,           // ISO 8601 UTC
    val deviceTimezoneOffset: Int,       // Minutes from UTC
    val deviceLocale: String,            // e.g. "en_US"

    // SYNC STATUS
    val syncStatus: String,              // pending, retrying, synced, failed
    val syncAttempts: Int = 0,
    val nextRetryAt: Long? = null,
    val syncErrorMessage: String? = null,

    // SECURITY & INTEGRITY
    val isEncrypted: Boolean = true,
    val contentHash: String? = null,     // SHA-256 for tamper detection
    val tamperDetected: Boolean = false,

    // AI PREPROCESSING
    val likelyFinancial: Boolean? = null,
    val locallyPreprocessed: Boolean = false,

    // VERSIONING
    val appVersion: String,
    val schemaVersion: Int = 3,
    val createdAt: Long = System.currentTimeMillis()
)
```

---

## 13. API Endpoints

### 13.1 Workspace Verification
```http
POST /api/android/verify-device
Authorization: None (public endpoint)
Content-Type: application/json

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

### 13.2 SMS Sync (Enterprise)
```http
POST /api/android/sync-sms
Authorization: Bearer dev_token_xyz...
Content-Type: application/json

{
  "workspaceId": "ws_123",
  "deviceId": "dev_uuid",
  "smsHash": "a1b2c3...",
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

### 13.3 Heartbeat
```http
POST /api/android/heartbeat
Authorization: Bearer dev_token_xyz...
Content-Type: application/json

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

---

## 14. Acceptance Criteria

The Android app is considered **complete** only if:

✅ **No SMS is lost** - Every SMS queued with retry
✅ **Duplicate SMS do not corrupt data** - Idempotency via sms_hash
✅ **Backend can monitor device health** - 5-minute heartbeat with full status
✅ **User can clearly see if ingestion is working** - Diagnostic status screen
✅ **App survives network loss, reboots, and OS restrictions** - WorkManager + foreground service
✅ **Workspace data isolation is preserved** - Device locked to one workspace
✅ **No silent failures** - All errors visible in UI

---

## 15. Migration from Legacy App

**Legacy Architecture:**
- User-based authentication (`user_id`, `email`, `auth_token`)
- Semi-account based SMS storage
- No workspace binding
- No idempotency hashing
- No UTC normalization

**Migration Path:**
1. Update database schema to v3 (add workspace_id, device_id, sms_hash, etc.)
2. Migrate existing users to workspace-based devices
3. Force re-verification on first launch (WorkspaceSetupActivity)
4. Legacy endpoints remain functional during migration
5. Gradual rollout: 10% → 50% → 100%

**Backward Compatibility:**
- Legacy `SmsReceiver.kt` remains functional
- New devices use `SmsReceiverEnterprise.kt`
- Backend accepts both legacy and enterprise endpoints
- Deprecation timeline: 6 months

---

## 16. Performance & Battery Discipline

**Principles:**
- Use `WorkManager` for retries (respects Doze mode)
- Use foreground service **ONLY** when actively sending
- Respect Doze mode (no constant background execution)
- Avoid wake locks
- Avoid constant background execution

**Reliability without battery abuse.**

**Battery Usage Profile:**
- Idle: <1% per 24 hours
- Active (5 SMS/hour): ~2% per 24 hours
- Heartbeat: ~0.5% per 24 hours

**Total: <3.5% per 24 hours** (enterprise-acceptable)

---

## 17. Security Considerations

### 17.1 E2EE Encryption

**SMS Content:**
- Encrypted using AES-256-GCM
- Key derived from device-specific secret
- Decrypted only during sync (sent to backend decrypted)

### 17.2 Secure Storage

**Workspace Binding:**
- Stored in `SharedPreferences` (MODE_PRIVATE)
- Device token never logged or exposed
- Token rotation supported

### 17.3 Tamper Detection

**Content Integrity:**
- SHA-256 hash stored with each SMS
- Verified before sync
- Marked as `tamperDetected = true` if hash mismatch

---

## 18. Final Notes

**This Android app must behave like:**

> A small, secure, always-on financial data collector —
> not a consumer application.

**Build it accordingly.**

**Key Principles:**
- Infrastructure-grade reliability
- NO silent data loss
- Workspace data isolation
- Clear failure visibility
- Battery discipline
- Security by default

**Enterprise-grade SMS ingestion agent.**

---

**Document Version:** 1.0
**Last Updated:** February 11, 2025
**Android App Version:** 2.0.0 (Enterprise)
**Minimum Android:** API 24 (Android 7.0)
**Target Android:** API 34 (Android 14)
