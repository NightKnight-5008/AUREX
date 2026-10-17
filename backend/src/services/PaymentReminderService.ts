/**
 * Payment Reminder Service
 *
 * Core service for managing automated payment reminders
 *
 * FEATURES:
 * - Automatic reminder scheduling from payment due dates
 * - Atomic database operations to prevent duplicates
 * - Timezone-aware scheduling
 * - Integration with WhatsApp messaging
 * - Comprehensive logging
 * - Retry queue management
 *
 * @module PaymentReminderService
 */

import { type PoolClient } from 'pg';
import whatsAppService, { type SendMessageRequest } from './WhatsAppService';
import { decryptPhoneFromDB, hashPhoneNumber, redactPhoneNumber } from '../utils/phone-encryption';

/**
 * Reminder creation request
 */
export interface CreateReminderRequest {
  userId: string;
  cardId: string;
  paymentAmount: number;
  paymentDueDate: Date;
  cardLastFour: string;
  cardName: string;
  transactionId?: string;
}

/**
 * Reminder scheduling options
 */
export interface SchedulingOptions {
  reminderDaysBefore?: number; // Send reminder N days before due date (default: 0 = same day)
  reminderTime?: string; // HH:MM format (default: user preference or 09:00)
  timezone?: string; // IANA timezone (default: user preference or America/New_York)
}

/**
 * Send reminder request
 */
export interface SendReminderRequest {
  reminderId: string;
  forceRetry?: boolean; // Force send even if already sent
}

/**
 * Reminder status response
 */
export interface ReminderStatusResponse {
  reminderId: string;
  userId: string;
  paymentAmount: number;
  paymentDueDate: string;
  paymentStatus: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  deliveryStatus: string;
  attemptCount: number;
  lastAttemptAt?: string;
  deliveryError?: string;
}

/**
 * User reminder preferences
 */
export interface UserReminderPreferences {
  remindersEnabled: boolean;
  reminderTimeHour: number;
  timezone: string;
  whatsappConsentGiven: boolean;
  phoneNumber?: string; // Decrypted
}

/**
 * Payment Reminder Service
 */
export class PaymentReminderService {
  /**
   * Create a new payment reminder
   *
   * @param request - Reminder creation request
   * @param options - Scheduling options
   * @param db - Database client
   * @returns Reminder ID
   */
  static async createReminder(
    request: CreateReminderRequest,
    options: SchedulingOptions,
    db: PoolClient
  ): Promise<string> {
    // Get user preferences
    const prefs = await this.getUserPreferences(request.userId, db);

    if (!prefs.remindersEnabled) {
      throw new Error('User has disabled payment reminders');
    }

    if (!prefs.whatsappConsentGiven) {
      throw new Error('User has not given WhatsApp consent');
    }

    // Calculate reminder scheduled date/time
    const { scheduledDate, scheduledTime } = this.calculateReminderSchedule(
      request.paymentDueDate,
      options,
      prefs
    );

    // Check for existing reminder (prevent duplicates)
    const existingResult = await db.query(
      `SELECT id FROM payment_reminders
       WHERE card_id = $1 AND payment_due_date = $2 AND user_id = $3
       LIMIT 1`,
      [request.cardId, request.paymentDueDate, request.userId]
    );

    if (existingResult.rows.length > 0) {
      console.log(`[Reminder] Duplicate prevented for user ${request.userId}, card ${request.cardLastFour}`);
      return existingResult.rows[0].id;
    }

    // Create reminder
    const result = await db.query(
      `INSERT INTO payment_reminders (
        user_id, card_id, payment_amount, payment_due_date, payment_status,
        card_last_four, card_name, reminder_scheduled_date, reminder_scheduled_time,
        transaction_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id`,
      [
        request.userId,
        request.cardId,
        request.paymentAmount,
        request.paymentDueDate,
        'pending',
        request.cardLastFour,
        request.cardName,
        scheduledDate,
        scheduledTime,
        request.transactionId,
      ]
    );

    const reminderId = result.rows[0].id;

    console.log(`[Reminder] Created reminder ${reminderId} for user ${request.userId}, due ${request.paymentDueDate.toISOString()}`);

    return reminderId;
  }

  /**
   * Calculate reminder schedule based on due date and preferences
   */
  private static calculateReminderSchedule(
    dueDate: Date,
    options: SchedulingOptions,
    prefs: UserReminderPreferences
  ): { scheduledDate: Date; scheduledTime: string } {
    const daysBefore = options.reminderDaysBefore || 0;
    const reminderHour = options.reminderTime
      ? parseInt(options.reminderTime.split(':')[0])
      : prefs.reminderTimeHour;

    // Calculate scheduled date (N days before due date)
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(scheduledDate.getDate() - daysBefore);

    // Format time as HH:MM:SS
    const scheduledTime = options.reminderTime || `${reminderHour.toString().padStart(2, '0')}:00:00`;

    return { scheduledDate, scheduledTime };
  }

  /**
   * Get user reminder preferences
   */
  static async getUserPreferences(userId: string, db: PoolClient): Promise<UserReminderPreferences> {
    const result = await db.query(
      `SELECT reminders_enabled, reminder_time_hour, timezone, whatsapp_consent_given, phone_number_encrypted
       FROM user_reminder_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no preferences set
      return {
        remindersEnabled: false,
        reminderTimeHour: 9,
        timezone: 'America/New_York',
        whatsappConsentGiven: false,
      };
    }

    const row = result.rows[0];

    return {
      remindersEnabled: row.reminders_enabled,
      reminderTimeHour: row.reminder_time_hour,
      timezone: row.timezone,
      whatsappConsentGiven: row.whatsapp_consent_given,
      phoneNumber: row.phone_number_encrypted ? decryptPhoneFromDB(row.phone_number_encrypted) : undefined,
    };
  }

  /**
   * Send a scheduled reminder
   *
   * @param request - Send reminder request
   * @param db - Database client
   * @returns True if sent successfully
   */
  static async sendReminder(request: SendReminderRequest, db: PoolClient): Promise<boolean> {
    // Start transaction
    await db.query('BEGIN');

    try {
      // Get reminder details
      const reminderResult = await db.query(
        `SELECT r.*, u.id as user_id
         FROM payment_reminders r
         JOIN users u ON r.user_id = u.id
         WHERE r.id = $1
         FOR UPDATE`, // Lock row to prevent concurrent sends
        [request.reminderId]
      );

      if (reminderResult.rows.length === 0) {
        await db.query('ROLLBACK');
        throw new Error('Reminder not found');
      }

      const reminder = reminderResult.rows[0];

      // Check if already sent (unless force retry)
      if (reminder.reminder_sent && !request.forceRetry) {
        await db.query('ROLLBACK');
        console.log(`[Reminder] Already sent: ${request.reminderId}`);
        return false;
      }

      // Get user preferences and phone number
      const prefs = await this.getUserPreferences(reminder.user_id, db);

      if (!prefs.phoneNumber) {
        await db.query('ROLLBACK');
        throw new Error('User phone number not found');
      }

      if (!prefs.remindersEnabled || !prefs.whatsappConsentGiven) {
        await db.query('ROLLBACK');
        throw new Error('User has disabled reminders or not given consent');
      }

      // Update attempt tracking
      await db.query(
        `UPDATE payment_reminders
         SET attempt_count = attempt_count + 1,
             last_attempt_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [request.reminderId]
      );

      // Commit transaction before sending (to log attempt even if send fails)
      await db.query('COMMIT');

      // Send WhatsApp message
      const sendRequest: SendMessageRequest = {
        phoneNumber: prefs.phoneNumber,
        templateParams: {
          cardName: reminder.card_name,
          cardLastFour: reminder.card_last_four,
          amount: parseFloat(reminder.payment_amount).toFixed(2),
          currency: 'USD', // TODO: Get from user preferences
          dueDate: new Date(reminder.payment_due_date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        },
        reminderIdempotencyKey: request.reminderId,
      };

      const sendResponse = await whatsAppService.sendPaymentReminder(sendRequest);

      // Log delivery attempt
      await this.logDeliveryAttempt(
        {
          reminderId: request.reminderId,
          userId: reminder.user_id,
          phoneNumber: prefs.phoneNumber,
          attemptNumber: reminder.attempt_count + 1,
          status: sendResponse.success ? 'sent' : 'failed',
          messageId: sendResponse.messageId,
          errorCode: sendResponse.errorCode,
          errorMessage: sendResponse.error,
          messageContent: `Payment reminder for ${reminder.card_name} ****${reminder.card_last_four}`,
        },
        db
      );

      // Update reminder status
      if (sendResponse.success) {
        await db.query(
          `UPDATE payment_reminders
           SET reminder_sent = TRUE,
               reminder_sent_at = CURRENT_TIMESTAMP,
               delivery_status = $1,
               whatsapp_message_id = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [sendResponse.status, sendResponse.messageId, request.reminderId]
        );

        console.log(`[Reminder] Sent successfully: ${request.reminderId} to ${redactPhoneNumber(prefs.phoneNumber)}`);
        return true;
      } else {
        // Update error status
        await db.query(
          `UPDATE payment_reminders
           SET delivery_status = 'failed',
               delivery_error = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [sendResponse.error, request.reminderId]
        );

        // Add to retry queue
        await this.addToRetryQueue(request.reminderId, reminder.attempt_count + 1, db);

        console.error(`[Reminder] Send failed: ${request.reminderId} - ${sendResponse.error}`);
        return false;
      }
    } catch (error) {
      await db.query('ROLLBACK');
      console.error(`[Reminder] Error sending reminder ${request.reminderId}:`, error);
      throw error;
    }
  }

  /**
   * Log delivery attempt
   */
  private static async logDeliveryAttempt(
    params: {
      reminderId: string;
      userId: string;
      phoneNumber: string;
      attemptNumber: number;
      status: string;
      messageId?: string;
      errorCode?: string;
      errorMessage?: string;
      messageContent: string;
    },
    db: PoolClient
  ): Promise<void> {
    await db.query(
      `INSERT INTO reminder_delivery_log (
        reminder_id, user_id, attempt_number, attempted_at,
        message_content, recipient_phone, status, whatsapp_message_id,
        error_code, error_message, created_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        params.reminderId,
        params.userId,
        params.attemptNumber,
        params.messageContent,
        hashPhoneNumber(params.phoneNumber), // Store hashed phone for privacy
        params.status,
        params.messageId,
        params.errorCode,
        params.errorMessage,
      ]
    );
  }

  /**
   * Add reminder to retry queue
   */
  private static async addToRetryQueue(
    reminderId: string,
    currentAttempt: number,
    db: PoolClient
  ): Promise<void> {
    const maxRetries = 5;

    if (currentAttempt >= maxRetries) {
      console.log(`[Reminder] Max retries reached for ${reminderId}`);
      return;
    }

    // Calculate next retry time using exponential backoff
    const backoffMinutes = Math.pow(2, currentAttempt) * 5; // 5, 10, 20, 40, 80 minutes
    const scheduledRetryAt = new Date();
    scheduledRetryAt.setMinutes(scheduledRetryAt.getMinutes() + backoffMinutes);

    await db.query(
      `INSERT INTO reminder_retry_queue (
        reminder_id, scheduled_retry_at, retry_attempt, max_retries,
        backoff_strategy, next_retry_delay_seconds, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'exponential', $5, 'queued', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [reminderId, scheduledRetryAt, currentAttempt + 1, maxRetries, backoffMinutes * 60]
    );

    console.log(`[Reminder] Added to retry queue: ${reminderId}, retry in ${backoffMinutes} minutes`);
  }

  /**
   * Process due reminders (to be called by scheduler/cron)
   *
   * @param db - Database client
   * @returns Number of reminders processed
   */
  static async processDueReminders(db: PoolClient): Promise<number> {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Get all due reminders that haven't been sent
    const result = await db.query(
      `SELECT id
       FROM payment_reminders
       WHERE reminder_sent = FALSE
         AND delivery_status != 'cancelled'
         AND payment_status != 'paid'
         AND (
           (reminder_scheduled_date < $1) OR
           (reminder_scheduled_date = $1 AND reminder_scheduled_time <= $2)
         )
       ORDER BY reminder_scheduled_date ASC, reminder_scheduled_time ASC
       LIMIT 100`, // Process in batches
      [currentDate, currentTime]
    );

    const reminderIds = result.rows.map((row) => row.id);

    console.log(`[Reminder] Processing ${reminderIds.length} due reminders`);

    let successCount = 0;

    for (const reminderId of reminderIds) {
      try {
        const sent = await this.sendReminder({ reminderId }, db);
        if (sent) successCount++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Reminder] Error processing reminder ${reminderId}:`, error);
      }
    }

    return successCount;
  }

  /**
   * Process retry queue (to be called by scheduler/cron)
   *
   * @param db - Database client
   * @returns Number of retries processed
   */
  static async processRetryQueue(db: PoolClient): Promise<number> {
    const result = await db.query(
      `SELECT reminder_id, retry_attempt
       FROM reminder_retry_queue
       WHERE status = 'queued'
         AND scheduled_retry_at <= CURRENT_TIMESTAMP
       ORDER BY scheduled_retry_at ASC
       LIMIT 50`,
      []
    );

    const retries = result.rows;

    console.log(`[Reminder] Processing ${retries.length} retries`);

    let successCount = 0;

    for (const retry of retries) {
      try {
        // Mark as processing
        await db.query(
          `UPDATE reminder_retry_queue
           SET status = 'processing', updated_at = CURRENT_TIMESTAMP
           WHERE reminder_id = $1 AND retry_attempt = $2`,
          [retry.reminder_id, retry.retry_attempt]
        );

        // Attempt to send
        const sent = await this.sendReminder({ reminderId: retry.reminder_id, forceRetry: true }, db);

        // Update retry queue status
        await db.query(
          `UPDATE reminder_retry_queue
           SET status = $1, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE reminder_id = $2 AND retry_attempt = $3`,
          [sent ? 'completed' : 'failed', retry.reminder_id, retry.retry_attempt]
        );

        if (sent) successCount++;

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`[Reminder] Error processing retry for ${retry.reminder_id}:`, error);

        await db.query(
          `UPDATE reminder_retry_queue
           SET status = 'failed', last_error = $1, updated_at = CURRENT_TIMESTAMP
           WHERE reminder_id = $2 AND retry_attempt = $3`,
          [error instanceof Error ? error.message : 'Unknown error', retry.reminder_id, retry.retry_attempt]
        );
      }
    }

    return successCount;
  }

  /**
   * Get reminder status
   *
   * @param reminderId - Reminder ID
   * @param db - Database client
   * @returns Reminder status
   */
  static async getReminderStatus(reminderId: string, db: PoolClient): Promise<ReminderStatusResponse> {
    const result = await db.query(
      `SELECT id, user_id, payment_amount, payment_due_date, payment_status,
              reminder_sent, reminder_sent_at, delivery_status, attempt_count,
              last_attempt_at, delivery_error
       FROM payment_reminders
       WHERE id = $1`,
      [reminderId]
    );

    if (result.rows.length === 0) {
      throw new Error('Reminder not found');
    }

    const row = result.rows[0];

    return {
      reminderId: row.id,
      userId: row.user_id,
      paymentAmount: parseFloat(row.payment_amount),
      paymentDueDate: row.payment_due_date,
      paymentStatus: row.payment_status,
      reminderSent: row.reminder_sent,
      reminderSentAt: row.reminder_sent_at,
      deliveryStatus: row.delivery_status,
      attemptCount: row.attempt_count,
      lastAttemptAt: row.last_attempt_at,
      deliveryError: row.delivery_error,
    };
  }

  /**
   * Mark payment as paid (updates reminder status)
   *
   * @param reminderId - Reminder ID
   * @param db - Database client
   */
  static async markPaymentPaid(reminderId: string, db: PoolClient): Promise<void> {
    await db.query(
      `UPDATE payment_reminders
       SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [reminderId]
    );

    // Cancel any pending retries
    await db.query(
      `UPDATE reminder_retry_queue
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE reminder_id = $1 AND status = 'queued'`,
      [reminderId]
    );

    console.log(`[Reminder] Marked payment as paid: ${reminderId}`);
  }

  /**
   * Get user's upcoming reminders
   *
   * @param userId - User ID
   * @param limit - Maximum number of reminders to return
   * @param db - Database client
   * @returns Array of upcoming reminders
   */
  static async getUserUpcomingReminders(
    userId: string,
    limit: number,
    db: PoolClient
  ): Promise<ReminderStatusResponse[]> {
    const result = await db.query(
      `SELECT id, user_id, payment_amount, payment_due_date, payment_status,
              reminder_sent, reminder_sent_at, delivery_status, attempt_count,
              last_attempt_at, delivery_error
       FROM payment_reminders
       WHERE user_id = $1
         AND payment_status != 'paid'
         AND payment_due_date >= CURRENT_DATE
       ORDER BY payment_due_date ASC, reminder_scheduled_time ASC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map((row) => ({
      reminderId: row.id,
      userId: row.user_id,
      paymentAmount: parseFloat(row.payment_amount),
      paymentDueDate: row.payment_due_date,
      paymentStatus: row.payment_status,
      reminderSent: row.reminder_sent,
      reminderSentAt: row.reminder_sent_at,
      deliveryStatus: row.delivery_status,
      attemptCount: row.attempt_count,
      lastAttemptAt: row.last_attempt_at,
      deliveryError: row.delivery_error,
    }));
  }
}
