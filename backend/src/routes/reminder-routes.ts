/**
 * Payment Reminder API Routes
 *
 * Express.js routes for payment reminder operations
 *
 * ENDPOINTS:
 * - POST /api/reminders/preferences - Set user reminder preferences
 * - GET /api/reminders/preferences - Get user reminder preferences
 * - POST /api/reminders/create - Create a payment reminder
 * - GET /api/reminders/upcoming - Get user's upcoming reminders
 * - GET /api/reminders/:id/status - Get reminder status
 * - POST /api/reminders/:id/mark-paid - Mark payment as paid
 * - POST /api/reminders/process-due - Process due reminders (admin/cron)
 * - POST /api/reminders/process-retries - Process retry queue (admin/cron)
 *
 * @module reminder-routes
 */

import express, { type Request, type Response } from 'express';
import type { PoolClient } from 'pg';
import { PaymentReminderService } from '../services/PaymentReminderService';
import {
  encryptPhoneForDB,
  decryptPhoneFromDB,
  validatePhoneNumber,
  sanitizePhoneNumber,
} from '../utils/phone-encryption';
import { authenticateToken, authenticateAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/reminders/preferences
 *
 * Set user reminder preferences
 *
 * Request body:
 * {
 *   phoneNumber: string,
 *   phoneCountryCode: string,
 *   remindersEnabled: boolean,
 *   reminderTimeHour: number,
 *   timezone: string,
 *   whatsappConsentGiven: boolean,
 *   privacyNoticeAccepted: boolean
 * }
 */
router.post('/preferences', authenticateToken, async (req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    const userId = (req as any).user.id;
    const {
      phoneNumber,
      phoneCountryCode,
      remindersEnabled,
      reminderTimeHour,
      timezone,
      whatsappConsentGiven,
      privacyNoticeAccepted,
    } = req.body;

    // Validate phone number if provided
    let encryptedPhone = null;
    if (phoneNumber) {
      const sanitized = sanitizePhoneNumber(phoneNumber, phoneCountryCode || '+1');

      if (!validatePhoneNumber(sanitized)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Use E.164 format (e.g., +14155552671)',
        });
      }

      encryptedPhone = encryptPhoneForDB(sanitized);
    }

    // Validate reminder hour
    if (reminderTimeHour !== undefined && (reminderTimeHour < 0 || reminderTimeHour > 23)) {
      return res.status(400).json({
        success: false,
        message: 'Reminder hour must be between 0 and 23',
      });
    }

    // Require consent if enabling reminders
    if (remindersEnabled && !whatsappConsentGiven) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp consent required to enable reminders',
      });
    }

    // Get database client
    const { getClient } = await import('../database.js');
    client = await getClient();

    // Upsert preferences
    await client.query(
      `INSERT INTO user_reminder_preferences (
        user_id, phone_number_encrypted, phone_country_code,
        reminders_enabled, reminder_time_hour, timezone,
        whatsapp_consent_given, whatsapp_consent_date,
        privacy_notice_accepted, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        phone_number_encrypted = COALESCE(EXCLUDED.phone_number_encrypted, user_reminder_preferences.phone_number_encrypted),
        phone_country_code = COALESCE(EXCLUDED.phone_country_code, user_reminder_preferences.phone_country_code),
        reminders_enabled = COALESCE(EXCLUDED.reminders_enabled, user_reminder_preferences.reminders_enabled),
        reminder_time_hour = COALESCE(EXCLUDED.reminder_time_hour, user_reminder_preferences.reminder_time_hour),
        timezone = COALESCE(EXCLUDED.timezone, user_reminder_preferences.timezone),
        whatsapp_consent_given = COALESCE(EXCLUDED.whatsapp_consent_given, user_reminder_preferences.whatsapp_consent_given),
        whatsapp_consent_date = CASE WHEN EXCLUDED.whatsapp_consent_given THEN CURRENT_TIMESTAMP ELSE user_reminder_preferences.whatsapp_consent_date END,
        privacy_notice_accepted = COALESCE(EXCLUDED.privacy_notice_accepted, user_reminder_preferences.privacy_notice_accepted),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        encryptedPhone,
        phoneCountryCode || '+1',
        remindersEnabled,
        reminderTimeHour,
        timezone || 'America/New_York',
        whatsappConsentGiven,
        whatsappConsentGiven ? new Date() : null,
        privacyNoticeAccepted,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('[Reminder Preferences Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * GET /api/reminders/preferences
 *
 * Get user reminder preferences
 */
router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    const userId = (req as any).user.id;

    const { getClient } = await import('../database.js');
    client = await getClient();

    const result = await client.query(
      `SELECT phone_number_encrypted, phone_country_code, reminders_enabled,
              reminder_time_hour, timezone, whatsapp_consent_given,
              whatsapp_consent_date, privacy_notice_accepted
       FROM user_reminder_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        preferences: {
          remindersEnabled: false,
          reminderTimeHour: 9,
          timezone: 'America/New_York',
          whatsappConsentGiven: false,
          privacyNoticeAccepted: false,
          phoneNumber: null,
        },
      });
    }

    const row = result.rows[0];

    // Decrypt phone number for display (last 4 digits only)
    let phoneDisplay = null;
    if (row.phone_number_encrypted) {
      try {
        const fullPhone = decryptPhoneFromDB(row.phone_number_encrypted);
        phoneDisplay = fullPhone.slice(-4);
      } catch (error) {
        console.error('[Reminder] Error decrypting phone:', error);
      }
    }

    return res.status(200).json({
      success: true,
      preferences: {
        phoneNumber: phoneDisplay,
        phoneCountryCode: row.phone_country_code,
        remindersEnabled: row.reminders_enabled,
        reminderTimeHour: row.reminder_time_hour,
        timezone: row.timezone,
        whatsappConsentGiven: row.whatsapp_consent_given,
        whatsappConsentDate: row.whatsapp_consent_date,
        privacyNoticeAccepted: row.privacy_notice_accepted,
      },
    });
  } catch (error) {
    console.error('[Reminder Preferences Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * POST /api/reminders/create
 *
 * Create a payment reminder
 *
 * Request body:
 * {
 *   cardId: string,
 *   paymentAmount: number,
 *   paymentDueDate: string (ISO date),
 *   cardLastFour: string,
 *   cardName: string,
 *   transactionId?: string
 * }
 */
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    const userId = (req as any).user.id;
    const { cardId, paymentAmount, paymentDueDate, cardLastFour, cardName, transactionId } = req.body;

    // Validate required fields
    if (!cardId || !paymentAmount || !paymentDueDate || !cardLastFour) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cardId, paymentAmount, paymentDueDate, cardLastFour',
      });
    }

    const { getClient } = await import('../database.js');
    client = await getClient();

    // Create reminder
    const reminderId = await PaymentReminderService.createReminder(
      {
        userId,
        cardId,
        paymentAmount: parseFloat(paymentAmount),
        paymentDueDate: new Date(paymentDueDate),
        cardLastFour,
        cardName: cardName || `Card ****${cardLastFour}`,
        transactionId,
      },
      {}, // Use default scheduling options
      client
    );

    return res.status(201).json({
      success: true,
      reminderId,
      message: 'Payment reminder created successfully',
    });
  } catch (error) {
    console.error('[Create Reminder Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * GET /api/reminders/upcoming
 *
 * Get user's upcoming reminders
 */
router.get('/upcoming', authenticateToken, async (req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    const userId = (req as any).user.id;
    const limit = parseInt((req.query.limit as string) || '10');

    const { getClient } = await import('../database.js');
    client = await getClient();

    const reminders = await PaymentReminderService.getUserUpcomingReminders(userId, limit, client);

    return res.status(200).json({
      success: true,
      reminders,
    });
  } catch (error) {
    console.error('[Get Upcoming Reminders Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * GET /api/reminders/:id/status
 *
 * Get reminder status
 */
router.get('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    const reminderId = req.params.id;

    const { getClient } = await import('../database.js');
    client = await getClient();

    const status = await PaymentReminderService.getReminderStatus(reminderId, client);

    return res.status(200).json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('[Get Reminder Status Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * POST /api/reminders/:id/mark-paid
 *
 * Mark payment as paid
 */
router.post('/:id/mark-paid', authenticateToken, async (req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    const reminderId = req.params.id;

    const { getClient } = await import('../database.js');
    client = await getClient();

    await PaymentReminderService.markPaymentPaid(reminderId, client);

    return res.status(200).json({
      success: true,
      message: 'Payment marked as paid',
    });
  } catch (error) {
    console.error('[Mark Payment Paid Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * POST /api/reminders/process-due
 *
 * Process due reminders (admin/cron endpoint)
 *
 * Security: Should be called only by scheduled job or admin
 */
router.post('/process-due', authenticateAdmin, async (_req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    // Admin authentication is now enforced by authenticateAdmin middleware

    const { getClient } = await import('../database.js');
    client = await getClient();

    const processedCount = await PaymentReminderService.processDueReminders(client);

    return res.status(200).json({
      success: true,
      processedCount,
      message: `Processed ${processedCount} due reminders`,
    });
  } catch (error) {
    console.error('[Process Due Reminders Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

/**
 * POST /api/reminders/process-retries
 *
 * Process retry queue (admin/cron endpoint)
 */
router.post('/process-retries', authenticateAdmin, async (_req: Request, res: Response) => {
  let client: PoolClient | null = null;

  try {
    // Admin authentication is now enforced by authenticateAdmin middleware

    const { getClient } = await import('../database.js');
    client = await getClient();

    const processedCount = await PaymentReminderService.processRetryQueue(client);

    return res.status(200).json({
      success: true,
      processedCount,
      message: `Processed ${processedCount} retries`,
    });
  } catch (error) {
    console.error('[Process Retries Error]', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  } finally {
    if (client && 'release' in client) {
      (client as any).release();
    }
  }
});

export default router;
