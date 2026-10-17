

# AUREX Payment Reminder System

Comprehensive WhatsApp-based automated payment reminder system replacing Google Calendar reminders.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [WhatsApp Integration](#whatsapp-integration)
- [Phone Number Encryption](#phone-number-encryption)
- [Scheduling & Cron Jobs](#scheduling--cron-jobs)
- [Retry Logic](#retry-logic)
- [Frontend Integration](#frontend-integration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## Overview

The AUREX Payment Reminder System provides automated WhatsApp notifications for upcoming payment due dates, replacing the previous Google Calendar integration.

### Key Features

- **WhatsApp Notifications**: Automated messages sent via WhatsApp Business API or Twilio
- **Encrypted Phone Storage**: AES-256-GCM encryption for phone numbers at rest
- **Atomic Operations**: Database-level atomic updates prevent duplicate reminders
- **Retry Logic**: Exponential backoff retry queue for failed deliveries
- **Timezone Aware**: User-specific timezone support for accurate scheduling
- **Offline Resilience**: Retry queue ensures messages sent when server recovers
- **Privacy Focused**: Minimal data exposure, encrypted storage, hashed logs
- **Scalable**: Designed to handle thousands of users with batch processing

### Supported WhatsApp Providers

1. **Twilio WhatsApp API** (Recommended for production)
2. **Official WhatsApp Business API** (Meta/Facebook)
3. **Custom Mock Provider** (Development/testing)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           AUREX Payment Reminder System Architecture        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  Cron Job    │    │  Backend API │    │   Frontend   │ │
│  │              │    │              │    │              │ │
│  │ • Process    │───▶│ • Preferences│◀───│ • Settings   │ │
│  │   Due        │    │ • Create     │    │   UI         │ │
│  │ • Process    │    │ • Status     │    │ • Status     │ │
│  │   Retries    │    │ • Mark Paid  │    │   Display    │ │
│  └──────────────┘    └──────┬───────┘    └──────────────┘ │
│                              │                             │
│                    ┌─────────▼─────────┐                   │
│                    │ PaymentReminder   │                   │
│                    │     Service       │                   │
│                    │  • Scheduling     │                   │
│                    │  • Sending        │                   │
│                    │  • Logging        │                   │
│                    └─────────┬─────────┘                   │
│                              │                             │
│         ┌────────────────────┼────────────────────┐        │
│         │                    │                    │        │
│  ┌──────▼──────┐    ┌────────▼────────┐   ┌──────▼─────┐ │
│  │   WhatsApp  │    │   PostgreSQL    │   │ Encryption │ │
│  │   Service   │    │   Database      │   │  Service   │ │
│  │             │    │                 │   │            │ │
│  │ • Twilio    │    │ • Reminders     │   │ • AES-256  │ │
│  │ • Official  │    │ • Preferences   │   │ • Phone #  │ │
│  │ • Custom    │    │ • Retry Queue   │   │            │ │
│  └─────────────┘    └─────────────────┘   └────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Database Setup

Run the migration to create required tables:

```bash
cd backend
psql $DATABASE_URL < migrations/005_payment_reminders.sql
```

### 2. Environment Variables

Add to `backend/.env`:

```env
# Phone Number Encryption
PHONE_ENCRYPTION_KEY=your-secure-random-key-here

# WhatsApp Configuration (choose one provider)

# Option A: Twilio (Recommended)
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
WHATSAPP_FROM_NUMBER=whatsapp:+14155238886

# Option B: Official WhatsApp Business API
# WHATSAPP_PROVIDER=official
# WHATSAPP_API_URL=https://graph.facebook.com/v18.0
# WHATSAPP_API_KEY=your_api_key
# WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Option C: Custom/Mock (Development only)
# WHATSAPP_PROVIDER=custom

# Cron API Key (optional security)
CRON_API_KEY=your-cron-api-key
```

### 3. Install Dependencies

```bash
npm install axios
```

### 4. Test Setup

Create test users:

```bash
psql $DATABASE_URL < test-config/test-users.sql
```

### 5. Set User Preferences

```bash
curl -X POST http://localhost:3001/api/reminders/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "phoneNumber": "+12025551234",
    "phoneCountryCode": "+1",
    "remindersEnabled": true,
    "reminderTimeHour": 9,
    "timezone": "America/New_York",
    "whatsappConsentGiven": true,
    "privacyNoticeAccepted": true
  }'
```

### 6. Run Cron Job

Process due reminders manually:

```bash
tsx scripts/process-reminders-cron.ts
```

Or set up automated cron:

```bash
# Add to crontab: run every hour
0 * * * * cd /path/to/backend && tsx scripts/process-reminders-cron.ts >> /var/log/aurex-reminders.log 2>&1
```

---

## Database Schema

### `user_reminder_preferences`

Stores user preferences for WhatsApp reminders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users table |
| `phone_number_encrypted` | TEXT | AES-256-GCM encrypted phone number |
| `phone_country_code` | VARCHAR(10) | Country code (e.g., "+1") |
| `reminders_enabled` | BOOLEAN | Whether reminders are enabled |
| `reminder_time_hour` | INTEGER | Hour of day to send (0-23) |
| `timezone` | VARCHAR(100) | IANA timezone (e.g., "America/New_York") |
| `whatsapp_consent_given` | BOOLEAN | User consent for WhatsApp messaging |
| `whatsapp_consent_date` | TIMESTAMP | When consent was given |
| `privacy_notice_accepted` | BOOLEAN | Privacy policy acceptance |

### `payment_reminders`

Scheduled reminders with delivery tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `card_id` | UUID | Foreign key to credit_cards |
| `payment_amount` | DECIMAL | Amount due |
| `payment_due_date` | DATE | When payment is due |
| `payment_status` | VARCHAR | pending/paid/overdue/cancelled |
| `card_last_four` | VARCHAR(4) | Last 4 digits of card |
| `card_name` | VARCHAR(100) | Card name for display |
| `reminder_scheduled_date` | DATE | When to send reminder |
| `reminder_scheduled_time` | TIME | Time to send |
| `reminder_sent` | BOOLEAN | Whether sent |
| `reminder_sent_at` | TIMESTAMP | When sent |
| `attempt_count` | INTEGER | Number of send attempts |
| `delivery_status` | VARCHAR | pending/sent/delivered/failed/cancelled |
| `delivery_error` | TEXT | Error message if failed |
| `whatsapp_message_id` | VARCHAR | WhatsApp message ID |

**Unique Constraint**: `(card_id, payment_due_date, user_id)` prevents duplicates

### `reminder_delivery_log`

Audit log of all delivery attempts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `reminder_id` | UUID | Foreign key to payment_reminders |
| `user_id` | UUID | Foreign key to users |
| `attempt_number` | INTEGER | Attempt number (1, 2, 3...) |
| `attempted_at` | TIMESTAMP | When attempt was made |
| `message_content` | TEXT | Message content |
| `recipient_phone` | VARCHAR | Hashed phone number (privacy) |
| `status` | VARCHAR | sending/sent/delivered/read/failed/rejected |
| `whatsapp_message_id` | VARCHAR | WhatsApp message ID |
| `whatsapp_response` | JSONB | Full API response |
| `error_code` | VARCHAR | Error code if failed |
| `error_message` | TEXT | Error details |

### `reminder_retry_queue`

Queue for failed reminder retries with exponential backoff.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `reminder_id` | UUID | Foreign key to payment_reminders |
| `scheduled_retry_at` | TIMESTAMP | When to retry |
| `retry_attempt` | INTEGER | Retry attempt number |
| `max_retries` | INTEGER | Maximum retries (default: 5) |
| `backoff_strategy` | VARCHAR | linear/exponential/fibonacci |
| `next_retry_delay_seconds` | INTEGER | Delay until next retry |
| `status` | VARCHAR | queued/processing/completed/failed/cancelled |
| `last_error` | TEXT | Last error message |

---

## API Endpoints

### `POST /api/reminders/preferences`

Set user reminder preferences.

**Authentication**: Required

**Request Body**:
```json
{
  "phoneNumber": "+12025551234",
  "phoneCountryCode": "+1",
  "remindersEnabled": true,
  "reminderTimeHour": 9,
  "timezone": "America/New_York",
  "whatsappConsentGiven": true,
  "privacyNoticeAccepted": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

### `GET /api/reminders/preferences`

Get user reminder preferences.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "preferences": {
    "phoneNumber": "1234", // Last 4 digits only
    "phoneCountryCode": "+1",
    "remindersEnabled": true,
    "reminderTimeHour": 9,
    "timezone": "America/New_York",
    "whatsappConsentGiven": true,
    "whatsappConsentDate": "2026-01-15T10:05:00Z",
    "privacyNoticeAccepted": true
  }
}
```

---

### `POST /api/reminders/create`

Create a payment reminder.

**Authentication**: Required

**Request Body**:
```json
{
  "cardId": "card-uuid",
  "paymentAmount": 150.00,
  "paymentDueDate": "2026-02-15",
  "cardLastFour": "1234",
  "cardName": "Chase Sapphire",
  "transactionId": "optional-transaction-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "reminderId": "reminder-uuid",
  "message": "Payment reminder created successfully"
}
```

---

### `GET /api/reminders/upcoming`

Get user's upcoming reminders.

**Authentication**: Required

**Query Parameters**:
- `limit` (optional, default: 10): Maximum reminders to return

**Response**:
```json
{
  "success": true,
  "reminders": [
    {
      "reminderId": "uuid",
      "userId": "uuid",
      "paymentAmount": 150.00,
      "paymentDueDate": "2026-02-15",
      "paymentStatus": "pending",
      "reminderSent": false,
      "reminderSentAt": null,
      "deliveryStatus": "pending",
      "attemptCount": 0
    }
  ]
}
```

---

### `GET /api/reminders/:id/status`

Get reminder status.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "status": {
    "reminderId": "uuid",
    "userId": "uuid",
    "paymentAmount": 150.00,
    "paymentDueDate": "2026-02-15",
    "paymentStatus": "pending",
    "reminderSent": true,
    "reminderSentAt": "2026-02-15T09:00:00Z",
    "deliveryStatus": "delivered",
    "attemptCount": 1,
    "lastAttemptAt": "2026-02-15T09:00:05Z",
    "deliveryError": null
  }
}
```

---

### `POST /api/reminders/:id/mark-paid`

Mark payment as paid (cancels pending reminders).

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Payment marked as paid"
}
```

---

### `POST /api/reminders/process-due`

Process due reminders (admin/cron endpoint).

**Authentication**: Optional API key (`X-API-Key` header)

**Response**:
```json
{
  "success": true,
  "processedCount": 15,
  "message": "Processed 15 due reminders"
}
```

---

### `POST /api/reminders/process-retries`

Process retry queue (admin/cron endpoint).

**Authentication**: Optional API key

**Response**:
```json
{
  "success": true,
  "processedCount": 3,
  "message": "Processed 3 retries"
}
```

---

## WhatsApp Integration

### Provider: Twilio

**Setup**:
1. Create Twilio account at https://www.twilio.com
2. Enable WhatsApp messaging
3. Get Account SID and Auth Token
4. Activate WhatsApp sandbox or production number

**Configuration**:
```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
WHATSAPP_FROM_NUMBER=whatsapp:+14155238886
```

**Message Format**: Plain text sent via Twilio Messaging API

---

### Provider: Official WhatsApp Business API

**Setup**:
1. Create Meta/Facebook Business account
2. Enable WhatsApp Business API
3. Get API key and Phone Number ID
4. Verify webhook URL

**Configuration**:
```env
WHATSAPP_PROVIDER=official
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_KEY=EAAxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
```

---

### Provider: Custom/Mock (Development)

**Setup**: None required (mock implementation)

**Configuration**:
```env
WHATSAPP_PROVIDER=custom
```

**Behavior**: Logs messages to console, simulates success in development mode

---

## Phone Number Encryption

Phone numbers are encrypted using **AES-256-GCM** authenticated encryption.

### Encryption Key Generation

```typescript
import { generateEncryptionKey } from './utils/phone-encryption';

const key = generateEncryptionKey();
// Add to .env: PHONE_ENCRYPTION_KEY=<key>
```

### Encryption Process

1. **Input**: Plain phone number (E.164 format: `+12025551234`)
2. **Sanitize**: Remove formatting, validate E.164
3. **Encrypt**: AES-256-GCM with random IV
4. **Store**: `encrypted$iv$authTag` format in database

### Decryption Process

1. **Read**: Split `encrypted$iv$authTag` from database
2. **Decrypt**: AES-256-GCM with stored IV and auth tag
3. **Return**: Plain phone number

### Privacy Features

- **Hashed Logs**: Phone numbers never logged in plain text
- **Redacted Display**: Only show last 4 digits in UI
- **Tamper Detection**: Auth tag prevents modification

---

## Scheduling & Cron Jobs

### Manual Processing

```bash
# Process due reminders
tsx scripts/process-reminders-cron.ts

# Or via API
curl -X POST http://localhost:3001/api/reminders/process-due \
  -H "X-API-Key: your-cron-api-key"
```

### Automated Cron (Linux)

```bash
# Edit crontab
crontab -e

# Add line: run every hour
0 * * * * cd /path/to/backend && tsx scripts/process-reminders-cron.ts >> /var/log/aurex-reminders.log 2>&1
```

### Node-Cron (In-Process)

```typescript
import cron from 'node-cron';
import { PaymentReminderService } from './services/PaymentReminderService';
import { getClient } from './database';

// Run every hour
cron.schedule('0 * * * *', async () => {
  const client = await getClient();
  try {
    await PaymentReminderService.processDueReminders(client);
    await PaymentReminderService.processRetryQueue(client);
  } finally {
    client.release();
  }
});
```

### Render Cron Jobs

In `render.yaml`:

```yaml
services:
  - type: cron
    name: aurex-payment-reminders
    env: node
    schedule: "0 * * * *" # Every hour
    buildCommand: npm install && npm run build
    startCommand: tsx scripts/process-reminders-cron.ts
    envVars:
      - key: DATABASE_URL
        fromDatabase: aurex-db
      - key: WHATSAPP_PROVIDER
        value: twilio
      - key: TWILIO_ACCOUNT_SID
        sync: false
      - key: TWILIO_AUTH_TOKEN
        sync: false
```

---

## Retry Logic

### Exponential Backoff Strategy

Failed reminder deliveries are automatically retried with exponential backoff:

| Attempt | Delay | Cumulative Time |
|---------|-------|-----------------|
| 1st | Immediate | 0 minutes |
| 2nd | 5 minutes | 5 minutes |
| 3rd | 10 minutes | 15 minutes |
| 4th | 20 minutes | 35 minutes |
| 5th | 40 minutes | 75 minutes |
| 6th (max) | 80 minutes | 155 minutes |

**Formula**: `delay = 5 * 2^(attempt - 1)` minutes

### Retry Queue Processing

```typescript
// Automatic via cron
await PaymentReminderService.processRetryQueue(db);

// Manual force retry
await PaymentReminderService.sendReminder({
  reminderId: 'uuid',
  forceRetry: true
}, db);
```

### Max Retries

Default: **5 retries**

After 5 failed attempts, reminders are marked as `failed` and require manual intervention.

---

## Frontend Integration

### Example: React Reminder Preferences Component

```typescript
import React, { useState } from 'react';

function ReminderPreferences() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState(false);

  const savePreferences = async () => {
    const response = await fetch('/api/reminders/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        phoneNumber,
        phoneCountryCode: '+1',
        remindersEnabled: enabled,
        reminderTimeHour: 9,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        whatsappConsentGiven: consent,
        privacyNoticeAccepted: true
      })
    });

    const data = await response.json();
    if (data.success) {
      alert('Preferences saved!');
    }
  };

  return (
    <div>
      <h2>WhatsApp Payment Reminders</h2>

      <label>
        Phone Number (E.164 format):
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+12025551234"
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable WhatsApp reminders
      </label>

      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        I consent to receive WhatsApp messages for payment reminders.
        My phone number will be encrypted and used only for reminders.
      </label>

      <button onClick={savePreferences} disabled={!consent}>
        Save Preferences
      </button>
    </div>
  );
}
```

### Example: Upcoming Reminders Display

```typescript
function UpcomingReminders() {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    fetch('/api/reminders/upcoming?limit=5', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => setReminders(data.reminders));
  }, []);

  return (
    <div>
      <h2>Upcoming Payment Reminders</h2>
      {reminders.map(reminder => (
        <div key={reminder.reminderId} className="reminder-card">
          <p>Amount: ${reminder.paymentAmount.toFixed(2)}</p>
          <p>Due: {new Date(reminder.paymentDueDate).toLocaleDateString()}</p>
          <p>Status: {reminder.deliveryStatus}</p>
          {reminder.reminderSent && (
            <span>✓ Reminder sent</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### 1. Load Test Users

```bash
psql $DATABASE_URL < test-config/test-users.sql
```

### 2. Set Phone Numbers (Encrypted)

```bash
# Alice
curl -X POST http://localhost:3001/api/reminders/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ALICE_TOKEN" \
  -d '{
    "phoneNumber": "+12025551001",
    "remindersEnabled": true,
    "reminderTimeHour": 9,
    "timezone": "America/New_York",
    "whatsappConsentGiven": true,
    "privacyNoticeAccepted": true
  }'
```

### 3. Trigger Reminders Manually

```bash
# Process due reminders
curl -X POST http://localhost:3001/api/reminders/process-due
```

### 4. Check Delivery Logs

```sql
SELECT
  r.id,
  r.card_name,
  r.payment_amount,
  r.delivery_status,
  r.reminder_sent,
  d.status,
  d.attempted_at
FROM payment_reminders r
LEFT JOIN reminder_delivery_log d ON r.id = d.reminder_id
WHERE r.user_id = 'alice-test-uuid-0001-000000000001'::uuid
ORDER BY d.attempted_at DESC;
```

---

## Deployment

### Render Deployment

**Environment Variables** (add in Render dashboard):

```
PHONE_ENCRYPTION_KEY=<generate with generateEncryptionKey()>
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your sid>
TWILIO_AUTH_TOKEN=<your token>
WHATSAPP_FROM_NUMBER=whatsapp:+14155238886
CRON_API_KEY=<secure random key>
```

**Cron Job Setup**:

Create a cron job service in Render:
- **Schedule**: `0 * * * *` (hourly)
- **Command**: `tsx scripts/process-reminders-cron.ts`
- **Environment**: Same as main service

### Netlify Frontend

No changes needed - all reminder logic is backend-only. Frontend just makes API calls to Render backend.

### Electron Desktop

Include reminder preferences UI in settings. API calls go to Render backend.

---

## Security

### Phone Number Protection

- ✅ AES-256-GCM encryption at rest
- ✅ Never logged in plain text
- ✅ Hashed in delivery logs
- ✅ Only last 4 digits shown in UI
- ✅ Auth tag prevents tampering

### Message Content

- ✅ Only last 4 card digits included
- ✅ No full account numbers
- ✅ No sensitive personal data
- ✅ Payment reference only

### API Security

- ✅ JWT authentication required for user endpoints
- ✅ Optional API key for cron endpoints
- ✅ User can only access their own reminders
- ✅ Consent required before sending messages

### Privacy Compliance

- ✅ User consent required (GDPR/TCPA)
- ✅ Opt-out supported (disable reminders)
- ✅ Data minimization (only necessary fields)
- ✅ Audit log for compliance

---

## Troubleshooting

### Issue: Reminders Not Sending

**Check**:
1. Verify WhatsApp provider credentials in `.env`
2. Check user has `remindersEnabled = true`
3. Check user has `whatsappConsentGiven = true`
4. Verify phone number is encrypted and valid
5. Check cron job is running

**Debug**:
```sql
SELECT * FROM user_reminder_preferences WHERE user_id = '<uuid>';
SELECT * FROM payment_reminders WHERE reminder_sent = FALSE AND payment_due_date <= CURRENT_DATE;
```

---

### Issue: Phone Number Encryption Failing

**Error**: `PHONE_ENCRYPTION_KEY environment variable not set`

**Solution**: Add encryption key to `.env`:
```bash
# Generate key
tsx -e "import {generateEncryptionKey} from './src/utils/phone-encryption'; console.log(generateEncryptionKey())"

# Add to .env
echo "PHONE_ENCRYPTION_KEY=<generated-key>" >> .env
```

---

### Issue: WhatsApp API Rate Limiting

**Symptoms**: `429 Too Many Requests` errors

**Solution**: Increase delay between messages in `PaymentReminderService`:
```typescript
// In processDueReminders()
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
```

---

### Issue: Duplicate Reminders

**Check**: Database unique constraint
```sql
SELECT card_id, payment_due_date, user_id, COUNT(*)
FROM payment_reminders
GROUP BY card_id, payment_due_date, user_id
HAVING COUNT(*) > 1;
```

**Fix**: Unique constraint should prevent this. If found, manually delete duplicates.

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review delivery logs: `SELECT * FROM reminder_delivery_log ORDER BY attempted_at DESC LIMIT 20`
3. Check retry queue: `SELECT * FROM reminder_retry_queue WHERE status = 'queued'`
4. Test WhatsApp connection: `WhatsAppService.testConnection()`

---

**Generated**: 2026-02-08
**Version**: 1.0.0
**System**: WhatsApp Payment Reminders
**Replaces**: Google Calendar integration
