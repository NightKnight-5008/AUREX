#!/usr/bin/env node
/**
 * AUREX Payment Reminder Cron Job
 *
 * Scheduled task to process due payment reminders and retries
 *
 * USAGE:
 * ```bash
 * # Run manually
 * tsx scripts/process-reminders-cron.ts
 *
 * # Add to crontab (run every hour)
 * 0 * * * * cd /path/to/backend && tsx scripts/process-reminders-cron.ts >> /var/log/aurex-reminders.log 2>&1
 *
 * # Or use node-cron in application
 * ```
 *
 * ENVIRONMENT:
 * - DATABASE_URL: PostgreSQL connection string
 * - All WhatsApp API credentials
 * - CRON_API_KEY: Optional API key for webhook endpoint
 *
 * @module process-reminders-cron
 */

import * as dotenv from 'dotenv';
import { getClient, closePool } from '../src/database.js';
import { PaymentReminderService } from '../src/services/PaymentReminderService';

// Load environment variables
dotenv.config();

/**
 * Main cron job function
 */
async function runReminderCron() {
  const startTime = Date.now();
  console.log(`[CRON] Starting payment reminder processor at ${new Date().toISOString()}`);

  let client = null;

  try {
    // Get database connection
    client = await getClient();

    console.log('[CRON] Database connected successfully');

    // Step 1: Process due reminders
    console.log('[CRON] Processing due reminders...');
    const dueCount = await PaymentReminderService.processDueReminders(client);
    console.log(`[CRON] ✓ Processed ${dueCount} due reminders`);

    // Step 2: Process retry queue
    console.log('[CRON] Processing retry queue...');
    const retryCount = await PaymentReminderService.processRetryQueue(client);
    console.log(`[CRON] ✓ Processed ${retryCount} retries`);

    // Summary
    const duration = Date.now() - startTime;
    console.log(`[CRON] ✓ Completed in ${duration}ms`);
    console.log(`[CRON] Summary: ${dueCount} due reminders, ${retryCount} retries processed`);

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('[CRON] ✗ Error processing reminders:', error);

    // Log error details
    if (error instanceof Error) {
      console.error('[CRON] Error message:', error.message);
      console.error('[CRON] Error stack:', error.stack);
    }

    // Exit with error code
    process.exit(1);
  } finally {
    // Clean up database connection
    if (client && 'release' in client) {
      try {
        (client as any).release();
        console.log('[CRON] Database connection released');
      } catch (releaseError) {
        console.error('[CRON] Error releasing connection:', releaseError);
      }
    }

    // Close pool
    try {
      await closePool();
      console.log('[CRON] Database pool closed');
    } catch (closeError) {
      console.error('[CRON] Error closing pool:', closeError);
    }
  }
}

/**
 * Error handler for uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('[CRON] Uncaught exception:', error);
  process.exit(1);
});

/**
 * Error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRON] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the cron job
runReminderCron();
