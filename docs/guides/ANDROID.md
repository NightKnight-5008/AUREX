# Android App Setup Guide

## Overview

This guide covers setting up the AUREX Android companion app for SMS sync with the Supabase backend.

---

## 1. Prerequisites

- Android Studio
- Kotlin
- Supabase account and project

---

## 2. Add Dependencies

Add to and-app/app/build.gradle.kts:

```kotlin
dependencies {
    implementation("io.github.jan-tennert.supabase:postgrest-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:realtime-kt:2.0.0")
    implementation("io.github.jan-tennert.supabase:auth-kt:2.0.0")
}
```

---

## 3. Configure Supabase

Create and-app/app/src/main/res/values/supabase_config.xml:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="supabase_url">https://your-project-ref.supabase.co</string>
    <string name="supabase_anon_key">your-anon-key-here</string>
</resources>
```

---

## 4. Initialize Supabase Client

In AurexApplication.kt:

```kotlin
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime

class AurexApplication : Application() {
    companion object {
        lateinit var supabase: SupabaseClient
    }

    override fun onCreate() {
        super.onCreate()

        supabase = createSupabaseClient(
            supabaseUrl = getString(R.string.supabase_url),
            supabaseKey = getString(R.string.supabase_anon_key)
        ) {
            install(Postgrest)
            install(Realtime)
        }
    }
}
```

---

## 5. Common Operations

### Insert SMS Log

```kotlin
AurexApplication.supabase.from("sms_logs").insert(mapOf(
    "user_id" to userId,
    "sender" to sender,
    "content" to content,
    "sms_hash" to hash
))
```

### Query Data

```kotlin
val cards = AurexApplication.supabase
    .from("credit_cards")
    .select()
    .eq("user_id", userId)
    .decodeList<CreditCard>()
```

### Device Authentication

```kotlin
val result = supabase.from("security_credentials").insert(mapOf(
    "user_id" to userId,
    "device_id" to deviceId,
    "device_token" to token,
    "workspace_username" to username,
    "is_verified" to true
))
```

---

## 6. Features

- Automatic SMS detection from banks
- Dual SIM support
- E2E encryption for SMS data
- Background sync with smart retry
- Foreground service for Android 12+
- Battery optimization handling

---

## 7. Security

- Row Level Security (RLS) on all tables
- Device-based authentication
- Encrypted SMS data transmission
- User can only access their own data
