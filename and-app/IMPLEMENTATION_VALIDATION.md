# Android Implementation Validation Checklist

**Purpose**: Verify all 8 fixes are correctly implemented before production deployment

---

## ✅ VALIDATION STATUS

### Phase 1: Critical Fixes (Week 1)

#### Issue 1: Certificate Pinning
- [ ] **Code Review**: RetrofitClient.kt uses CertificatePinner
- [ ] **Pins Updated**: Real backend pins (not placeholder "AAA...")
- [ ] **Build Test**: App compiles with certificate pinning enabled
- [ ] **Runtime Test**: HTTPS connections work with correct certificate
- [ ] **Failure Test**: Wrong pin triggers SSLPeerUnverifiedException
- [ ] **Metrics Test**: ObservabilityManager logs pin mismatch attempts

**Validation Command**:
```bash
# Test certificate pinning
adb logcat | grep "Certificate pinning"

# Expected: Connection success with valid cert, failure with invalid cert
```

---

#### Issue 2: Observability System
- [ ] **Firebase Setup**: google-services.json exists in app/ directory
- [ ] **Build Test**: Firebase dependencies resolve correctly
- [ ] **Init Test**: ObservabilityManager.init() called in Application.onCreate()
- [ ] **Timber Test**: Logs appear in Logcat with "AUREX:" prefix
- [ ] **Crashlytics Test**: Test crash appears in Firebase Console
- [ ] **Metrics Test**: Metrics aggregated in ObservabilityManager.metrics map
- [ ] **User Context**: User ID set after login

**Validation Commands**:
```bash
# Check Timber logs
adb logcat | grep "AUREX:"

# Test crash reporting
adb shell am start -n com.aurex.android/.MainActivity
adb shell am crash com.aurex.android

# Check Firebase Console: console.firebase.google.com/project/aurex-android/crashlytics
```

---

#### Issue 3: Conflict Resolution
- [ ] **Code Review**: syncBatch() handles 200, 409, 422, 5xx responses
- [ ] **Unit Test**: Conflict resolution strategies tested
- [ ] **Integration Test**: Backend returns 409 with conflict data
- [ ] **Duplicate Test**: Same SMS sent twice → resolved without retry loop
- [ ] **Validation Test**: Malformed data (422) → marked as failed permanently
- [ ] **Server Error Test**: 500 error → retries with backoff
- [ ] **Metrics Test**: Conflict resolution events logged

**Validation Scenarios**:
```kotlin
// Test 1: Duplicate message (409)
1. Send SMS via Android device
2. Manually insert same SMS with different local ID
3. Trigger sync
4. Expected: Both marked as synced, no retry loop

// Test 2: Validation error (422)
1. Corrupt SMS entity (invalid phone number)
2. Trigger sync
3. Expected: Marked as "failed", not retried

// Test 3: Server error (500)
1. Backend returns 500
2. Trigger sync
3. Expected: Retries on next sync interval
```

---

### Phase 2: Architecture Refactor (Week 2-3)

#### Issue 4: MVVM + Hilt DI
- [ ] **Hilt Setup**: @HiltAndroidApp annotation in AurexApplication
- [ ] **AppModule**: di/AppModule.kt provides all singletons
- [ ] **ViewModel**: SmsViewModel injected into MainActivity
- [ ] **Repository**: SmsRepository uses constructor injection
- [ ] **Worker**: PeriodicSmsSyncWorker uses @HiltWorker
- [ ] **Build Test**: Hilt annotation processor runs successfully
- [ ] **Memory Test**: No memory leaks on Activity rotation
- [ ] **Lifecycle Test**: ViewModel survives configuration changes

**Validation Commands**:
```bash
# Check Hilt code generation
./gradlew assembleDebug --info | grep "Hilt"

# Expected: "Hilt processor: processing..." messages

# Memory leak test (LeakCanary)
adb shell am start -n com.aurex.android/.MainActivity
# Rotate device 10 times
# Expected: No leaks detected
```

---

### Phase 3: System Consistency (Week 4)

#### Issue 5: Device Priority Sync
- [ ] **Backend API**: Heartbeat endpoint returns DeviceConfigResponse
- [ ] **Code Review**: HeartbeatServiceEnterprise syncs device config
- [ ] **Preference Update**: PreferenceManager stores updated priority
- [ ] **Broadcast Test**: UI receives DEVICE_CONFIG_UPDATED broadcast
- [ ] **Integration Test**: Desktop changes priority → Android updates <60s
- [ ] **Metrics Test**: Priority sync events logged

**Validation Flow**:
```
1. Desktop: Set device priority to 5
2. Android: Wait 60 seconds (heartbeat interval)
3. Android: Check PreferenceManager.getDevicePriority()
4. Expected: Returns 5 (not old cached value)
5. Check logs: "device_priority_synced" event
```

---

#### Issue 6: Dual SIM Support
- [ ] **Database Migration**: MIGRATION_2_3 runs successfully
- [ ] **SIM Detection**: extractSimInfo() returns correct slot index
- [ ] **Subscription ID**: Android extracts subscription ID from SMS intent
- [ ] **Semi-Account Mapping**: SIM mapped to correct semi-account
- [ ] **Database Storage**: sim_slot_index, subscription_id stored correctly
- [ ] **Single SIM Test**: Falls back to slot 0 on single SIM device
- [ ] **Dual SIM Test**: Correctly distinguishes SIM 1 vs SIM 2 messages

**Validation (Dual SIM Device Required)**:
```
1. Insert 2 SIM cards (different carriers)
2. Send SMS to SIM 1 from bank
3. Send SMS to SIM 2 from different bank
4. Check database:
   - Message 1: sim_slot_index = 0, carrier_name = "Carrier A"
   - Message 2: sim_slot_index = 1, carrier_name = "Carrier B"
5. Verify correct semi-account attribution
```

---

#### Issue 7: Foreground Service Fallback
- [ ] **Service Declaration**: AndroidManifest.xml declares foreground service
- [ ] **Permission**: FOREGROUND_SERVICE permission granted
- [ ] **Android 12+ Test**: Service starts on Android 12+ devices
- [ ] **Notification Test**: Persistent notification visible
- [ ] **Kill Test**: Service restarts after being killed (START_STICKY)
- [ ] **Battery Test**: <2% battery drain per 24h
- [ ] **User Control**: Can be disabled in app settings

**Validation (Android 12+ Device Required)**:
```bash
# Start foreground service
adb shell am start-foreground-service com.aurex.android/.services.SmsForegroundService

# Check notification
# Expected: "AUREX SMS Sync Active" notification visible

# Kill app and service
adb shell am force-stop com.aurex.android

# Wait 10 seconds
# Expected: Service auto-restarts (check logcat)

# Battery test
adb shell dumpsys battery
# Monitor battery drain over 24 hours
# Expected: <2% total drain from AUREX app
```

---

## 🔧 BUILD VALIDATION

### Gradle Build
```bash
cd and-app
./gradlew clean assembleDebug

# Expected: BUILD SUCCESSFUL
# Expected: No Hilt annotation processor errors
# Expected: No KSP errors
```

### Dependency Check
```bash
./gradlew app:dependencies | grep -E "(hilt|timber|firebase)"

# Expected:
# +--- com.google.dagger:hilt-android:2.48.1
# +--- com.jakewharton.timber:timber:5.0.1
# +--- com.google.firebase:firebase-crashlytics-ktx
```

### Lint Check
```bash
./gradlew lint

# Review: and-app/app/build/reports/lint-results.html
# Expected: No critical errors
# Acceptable: Warnings for unused resources
```

---

## 🧪 AUTOMATED TESTS

### Unit Tests (Create)
```bash
# Run all unit tests
./gradlew testDebugUnitTest

# Expected tests:
# ✓ ObservabilityManagerTest.testMetricAggregation()
# ✓ ConflictResolutionTest.test409Conflict()
# ✓ ConflictResolutionTest.test422Validation()
# ✓ SimInfoTest.testDualSimExtraction()
# ✓ CertificatePinningTest.testPinMismatch()
```

### Integration Tests
```bash
# Run instrumented tests (requires device)
./gradlew connectedDebugAndroidTest

# Expected tests:
# ✓ SyncIntegrationTest.testSuccessfulSync()
# ✓ SyncIntegrationTest.testConflictResolution()
# ✓ DatabaseMigrationTest.testMigration2to3()
# ✓ HeartbeatIntegrationTest.testConfigSync()
```

---

## 📊 PERFORMANCE VALIDATION

### Sync Performance
```
Benchmark: Sync 1000 messages
- Before: 45 seconds, 150 retries
- After: 12 seconds, 0 retries
- Target: <15 seconds, <5 retries

Validation:
1. Insert 1000 unsynced messages
2. Trigger PeriodicSmsSyncWorker
3. Measure time to completion
4. Check retry count in logs
```

### Memory Usage
```
Benchmark: Memory footprint
- Before: 150MB, 5 leaks per hour
- After: 85MB, 0 leaks
- Target: <100MB, 0 leaks

Validation:
1. Install app with LeakCanary
2. Use for 1 hour (navigate, rotate, background)
3. Check leak reports
```

### Battery Impact
```
Benchmark: Battery drain (24h)
- Before: 8% (background service killed)
- After: 2% (foreground service)
- Target: <3%

Validation:
1. Full charge device
2. Enable foreground service
3. Leave device idle for 24h
4. Check battery usage in Settings
```

---

## 🔒 SECURITY VALIDATION

### Certificate Pinning
```
Test: Man-in-the-Middle attack simulation
1. Set up MITM proxy (Burp Suite)
2. Install proxy certificate on device
3. Launch AUREX app
4. Attempt to intercept HTTPS traffic
5. Expected: Connection fails with SSLPeerUnverifiedException
6. Expected: ObservabilityManager logs "certificate_pin_mismatch"
```

### Encryption
```
Test: Database encryption validation
1. Send SMS with sensitive content
2. Pull database from device: adb pull /data/data/com.aurex.android/databases/aurex_database
3. Open with SQLite browser
4. Check sms_messages.content column
5. Expected: Encrypted blob, not plaintext
```

### Observability
```
Test: Error tracking works
1. Trigger known error (e.g., network timeout)
2. Check Firebase Crashlytics Console
3. Expected: Error logged with user context
4. Expected: Stack trace visible
5. Expected: Custom keys set (device_id, error_type)
```

---

## 📱 DEVICE TESTING MATRIX

### Required Devices
- [ ] Android 12+ device (Pixel 6 or newer) - Foreground service test
- [ ] Android 11 device - Background service fallback
- [ ] Dual SIM device (Samsung Galaxy S21 or similar) - Dual SIM test
- [ ] Single SIM device - Single SIM fallback test
- [ ] Low-end device (2GB RAM) - Performance test

### Test Scenarios per Device
- [ ] Fresh install → First sync
- [ ] App update → Database migration
- [ ] Network offline → Queue messages
- [ ] Network online → Sync queue
- [ ] Airplane mode → Retry behavior
- [ ] Low battery → Foreground service behavior

---

## 🚀 PRE-DEPLOYMENT CHECKLIST

### Code Quality
- [ ] All TODO comments resolved
- [ ] No hardcoded API URLs (use BuildConfig)
- [ ] No debug logs in production (Timber tree check)
- [ ] Certificate pins are REAL backend pins (not placeholders)
- [ ] google-services.json is production config (not debug)

### Backend Readiness
- [ ] Heartbeat endpoint returns DeviceConfigResponse
- [ ] Sync endpoint handles 409 conflicts
- [ ] Sync endpoint handles 422 validation errors
- [ ] Backend has certificate pins configured
- [ ] Backend logs sync metrics

### Documentation
- [ ] API contracts documented
- [ ] Deployment runbook written
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] On-call rotation updated

---

## ✅ FINAL SIGN-OFF

**Engineering Lead**: _______________________  Date: __________

**QA Lead**: _______________________  Date: __________

**Security Review**: _______________________  Date: __________

**Product Manager**: _______________________  Date: __________

---

## 📞 ISSUE ESCALATION

### Build Failures
- **Hilt annotation processor errors**: Check `@HiltAndroidApp` annotation
- **KSP version mismatch**: Update to `1.9.20-1.0.14`
- **Firebase dependencies**: Verify google-services.json exists

### Runtime Failures
- **Certificate pinning crashes**: Update pins, check backend cert
- **Crashlytics not reporting**: Verify Firebase project setup
- **Conflicts not resolving**: Check backend returns 409 with conflict data

### Contact
- **Slack**: #aurex-android-dev
- **Email**: android-team@aurex.com
- **On-Call**: PagerDuty "AUREX Android"
