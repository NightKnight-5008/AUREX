# AUREX Android - Developer Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
```bash
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34
- Gradle 8.2.0
```

### Setup
```bash
# 1. Clone the repository
git clone <repository-url>

# 2. Open in Android Studio
File → Open → Select /and-app

# 3. Sync Gradle
Click "Sync Now" when prompted

# 4. Run the app
Select device → Click Run ▶️
```

---

## 📁 Project Structure

```
and-app/
├── app/src/main/java/com/aurex/android/
│   ├── api/                    # Retrofit API clients
│   │   ├── AurexApiService.kt  # API interface
│   │   └── RetrofitClient.kt   # Certificate pinning + Retrofit setup
│   │
│   ├── database/               # Room database
│   │   ├── AurexDatabase.kt    # DB + Migrations
│   │   ├── SmsEntity.kt        # SMS table schema
│   │   └── SmsDao.kt           # Data access object
│   │
│   ├── di/                     # Dependency Injection
│   │   └── AppModule.kt        # Hilt module
│   │
│   ├── models/                 # Data models
│   │   ├── SmsMessage.kt
│   │   ├── SemiAccount.kt
│   │   └── EnterpriseModels.kt
│   │
│   ├── observability/          # Logging & Monitoring
│   │   └── ObservabilityManager.kt  # Timber + Firebase
│   │
│   ├── receivers/              # Broadcast receivers
│   │   ├── SmsReceiverEnterprise.kt  # SMS capture
│   │   └── BootReceiver.kt           # Boot startup
│   │
│   ├── repository/             # Data layer
│   │   └── SmsRepository.kt    # Repository pattern
│   │
│   ├── services/               # Background services
│   │   ├── SmsSyncForegroundService.kt  # Android 12+ foreground service
│   │   └── HeartbeatServiceEnterprise.kt # Device heartbeat
│   │
│   ├── ui/                     # Activities & UI
│   │   ├── LoginActivity.kt
│   │   ├── MainActivity.kt
│   │   └── SemiAccountActivity.kt
│   │
│   ├── utils/                  # Utilities
│   │   ├── DualSimManager.kt           # Dual SIM support
│   │   ├── BatteryOptimizationManager.kt # Battery handling
│   │   ├── EncryptionUtils.kt          # E2EE
│   │   └── PreferenceManager.kt        # SharedPreferences
│   │
│   ├── viewmodel/              # MVVM ViewModels
│   │   ├── SmsViewModel.kt            # SMS state management
│   │   └── DeviceConfigViewModel.kt   # Device configuration
│   │
│   ├── workers/                # WorkManager
│   │   ├── PeriodicSmsSyncWorker.kt  # Periodic sync
│   │   └── WorkManagerScheduler.kt   # Scheduling logic
│   │
│   └── AurexApplication.kt     # @HiltAndroidApp entry point
```

---

## 🔑 Key Components

### 1. SMS Capture Flow
```
SMS Received
   ↓
SmsReceiverEnterprise (Real-time capture)
   ↓
DualSimManager (Extract SIM info)
   ↓
SmsRepository (Save to Room DB)
   ↓
SmsSyncWorkerEnterprise (Background sync)
   ↓
AurexApiService (Upload to server)
```

### 2. MVVM Pattern
```kotlin
// Activity/Fragment
class MainActivity : AppCompatActivity() {
    private val viewModel: SmsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Observe LiveData
        viewModel.pendingCount.observe(this) { count ->
            updateUI(count)
        }

        // Trigger actions
        viewModel.triggerManualSync()
    }
}

// ViewModel
@HiltViewModel
class SmsViewModel @Inject constructor(
    private val repository: SmsRepository
) : ViewModel() {

    private val _pendingCount = MutableLiveData<Int>()
    val pendingCount: LiveData<Int> = _pendingCount

    fun triggerManualSync() {
        viewModelScope.launch {
            repository.syncPendingMessages()
        }
    }
}
```

### 3. Dependency Injection (Hilt)
```kotlin
// In ViewModel
@HiltViewModel
class SmsViewModel @Inject constructor(
    private val repository: SmsRepository,
    private val observabilityManager: ObservabilityManager
) : ViewModel()

// In Activity
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    @Inject lateinit var apiService: AurexApiService
}

// In Application
@HiltAndroidApp
class AurexApplication : Application()
```

### 4. Room Database Operations
```kotlin
// Insert SMS
val smsEntity = SmsEntity(
    workspaceId = "workspace-123",
    deviceId = "device-456",
    phoneNumber = "+1234567890",
    sender = "BANK",
    content = "Your balance is $1000",
    simSlot = 0, // Dual SIM support
    simSubscriptionId = 1,
    simCarrierName = "Verizon"
)
smsRepository.insertSms(smsEntity)

// Query pending messages
val pending: Flow<List<SmsEntity>> = smsRepository.getPendingSms()

// Update sync status
smsRepository.updateSyncStatus(messageId, "synced")
```

### 5. WorkManager Scheduling
```kotlin
// Schedule periodic sync
WorkManagerScheduler.schedulePeriodicSync(
    context = applicationContext,
    intervalMinutes = 15,
    observabilityManager = observabilityManager
)

// Immediate retry
WorkManagerScheduler.scheduleImmediateRetry(
    context = applicationContext,
    observabilityManager = observabilityManager
)

// Get status
val status = WorkManagerScheduler.getWorkStatus(context)
```

### 6. Foreground Service (Android 12+)
```kotlin
// Start foreground service
SmsSyncForegroundService.startService(context)

// Stop foreground service
SmsSyncForegroundService.stopService(context)
```

---

## 🛠️ Common Tasks

### Add a New API Endpoint
```kotlin
// 1. Update AurexApiService.kt
@POST("/api/new-endpoint")
suspend fun newEndpoint(@Body request: NewRequest): Response<NewResponse>

// 2. Add model in models/
data class NewRequest(val field: String)

// 3. Call from Repository
suspend fun callNewEndpoint() {
    apiService.newEndpoint(NewRequest("value"))
}
```

### Add a New Database Table
```kotlin
// 1. Create Entity
@Entity(tableName = "new_table")
data class NewEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "field") val field: String
)

// 2. Create DAO
@Dao
interface NewDao {
    @Insert
    suspend fun insert(entity: NewEntity)

    @Query("SELECT * FROM new_table")
    fun getAll(): Flow<List<NewEntity>>
}

// 3. Update AurexDatabase
@Database(
    entities = [SmsEntity::class, NewEntity::class],
    version = 5 // Increment version
)
abstract class AurexDatabase : RoomDatabase() {
    abstract fun newDao(): NewDao

    // Add migration
    private val MIGRATION_4_5 = object : Migration(4, 5) {
        override fun migrate(database: SupportSQLiteDatabase) {
            database.execSQL("CREATE TABLE new_table ...")
        }
    }
}
```

### Add Observability Event
```kotlin
observabilityManager.trackEvent("user_action", mapOf(
    "action" to "button_clicked",
    "screen" to "main"
))

observabilityManager.recordException(exception, mapOf(
    "context" to "api_call"
))
```

---

## 🧪 Testing

### Unit Tests
```kotlin
// ViewModel Test
@Test
fun `test pending count updates`() = runTest {
    val viewModel = SmsViewModel(mockRepository, mockObservability)
    viewModel.pendingCount.observeForever { count ->
        assertEquals(5, count)
    }
}

// Repository Test
@Test
fun `test insert SMS`() = runTest {
    val entity = SmsEntity(...)
    repository.insertSms(entity)
    val result = repository.getSmsById(entity.id)
    assertEquals(entity, result)
}
```

### Run Tests
```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest

# Specific test class
./gradlew test --tests SmsViewModelTest
```

---

## 🐛 Debugging

### Enable Verbose Logging
```kotlin
// In AurexApplication.kt
override fun onCreate() {
    super.onCreate()
    if (BuildConfig.DEBUG) {
        Timber.plant(Timber.DebugTree())
    }
}
```

### Check WorkManager Status
```bash
adb shell dumpsys jobscheduler
```

### Inspect Room Database
```bash
adb shell
cd /data/data/com.aurex.android/databases
sqlite3 aurex_database
.tables
SELECT * FROM sms_messages;
```

### Monitor Foreground Service
```bash
adb shell dumpsys activity services SmsSyncForegroundService
```

---

## 📚 Useful Commands

```bash
# Build release APK
./gradlew assembleRelease

# Install debug build
./gradlew installDebug

# Run lint checks
./gradlew lint

# Generate code coverage
./gradlew createDebugCoverageReport

# Clean build
./gradlew clean
```

---

## 🔒 Security Checklist

- [ ] Certificate pinning enabled (RetrofitClient.kt)
- [ ] E2EE encryption for SMS content
- [ ] ProGuard rules configured
- [ ] No hardcoded secrets (use BuildConfig)
- [ ] Secure SharedPreferences (EncryptedSharedPreferences)
- [ ] Network security config (res/xml/network_security_config.xml)

---

## 📖 Additional Resources

- **Room Database**: https://developer.android.com/training/data-storage/room
- **WorkManager**: https://developer.android.com/topic/libraries/architecture/workmanager
- **Hilt**: https://developer.android.com/training/dependency-injection/hilt-android
- **Kotlin Coroutines**: https://kotlinlang.org/docs/coroutines-guide.html
- **MVVM**: https://developer.android.com/topic/architecture

---

## 💡 Pro Tips

1. **Always use ViewModelScope**: Never use GlobalScope in ViewModels
2. **Observe LiveData in onCreate()**: Not in onResume()
3. **Handle Configuration Changes**: Use ViewModel to survive rotation
4. **Test on Real Devices**: Especially for SMS and dual SIM features
5. **Monitor Battery Usage**: Foreground services must justify their existence

---

**Last Updated**: 2025-01-XX
**Maintainer**: AUREX Android Team
