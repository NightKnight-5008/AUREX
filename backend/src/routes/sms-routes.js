import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// SMS SEARCH WITH OWNERSHIP VALIDATION
// ============================================================

/**
 * GET /api/sms/search-by-phone
 *
 * Search for SMS messages by phone number with strict ownership validation.
 *
 * Security Logic:
 * 1. Check if phone number exists in database (linked to any semi-account)
 * 2. If exists, verify the semi-account belongs to the authenticated user
 * 3. Only return data if user owns the semi-account
 * 4. Return generic "no data" response if phone belongs to another user
 *
 * Query Parameters:
 * - phoneNumber: The phone number to search for (required)
 *
 * Response:
 * {
 *   exists: boolean,        // Does phone number exist in database?
 *   hasAccess: boolean,     // Does current user have access?
 *   semiAccount: object,    // Semi-account info (if hasAccess=true)
 *   messages: array,        // SMS messages (if hasAccess=true)
 *   message: string         // Optional explanation message
 * }
 */
router.get('/search-by-phone', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    const userId = req.user.id;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Phone number is required',
      });
    }

    // Step 1: Check if phone number exists in semi_accounts table
    const semiAccountResult = await query(
      `SELECT id, user_id, name, phone_number, created_at, updated_at
       FROM semi_accounts
       WHERE phone_number = $1
       LIMIT 1`,
      [phoneNumber]
    );

    // Phone number doesn't exist in database
    if (semiAccountResult.rows.length === 0) {
      return res.json({
        exists: false,
        hasAccess: false,
        semiAccount: null,
        messages: [],
        message: 'Phone number not found in system',
      });
    }

    const semiAccount = semiAccountResult.rows[0];

    // Step 2: Verify ownership - does this semi-account belong to the current user?
    if (semiAccount.user_id !== userId) {
      // Phone number exists but belongs to another user
      // Return generic "no access" response without revealing it exists elsewhere
      return res.json({
        exists: true,
        hasAccess: false,
        semiAccount: null,
        messages: [],
        message: 'No accessible data for this phone number',
      });
    }

    // Step 3: User owns the semi-account - return full data
    const messagesResult = await query(
      `SELECT id, user_id, semi_account_id, phone_number, sender, content, received_at, processed, created_at
       FROM sms_logs
       WHERE semi_account_id = $1
       ORDER BY received_at DESC
       LIMIT 1000`,
      [semiAccount.id]
    );

    return res.json({
      exists: true,
      hasAccess: true,
      semiAccount: {
        id: semiAccount.id,
        userId: semiAccount.user_id,
        name: semiAccount.name,
        phoneNumber: semiAccount.phone_number,
        createdAt: semiAccount.created_at,
        updatedAt: semiAccount.updated_at,
      },
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        semiAccountId: row.semi_account_id,
        phoneNumber: row.phone_number,
        sender: row.sender,
        content: row.content,
        receivedAt: row.received_at,
        processed: row.processed,
        createdAt: row.created_at,
      })),
      message: 'Access granted',
    });
  } catch (error) {
    console.error('SMS search error:', error.message);
    res.status(500).json({ error: 'Failed to search SMS messages' });
  }
});

/**
 * GET /api/sms/by-semi-account/:semiAccountId
 *
 * Get all SMS messages for a specific semi-account (with ownership validation)
 */
router.get('/by-semi-account/:semiAccountId', authenticateToken, async (req, res) => {
  try {
    const { semiAccountId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const semiAccountResult = await query(
      'SELECT id FROM semi_accounts WHERE id = $1 AND user_id = $2',
      [semiAccountId, userId]
    );

    if (semiAccountResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messagesResult = await query(
      `SELECT id, user_id, semi_account_id, phone_number, sender, content, received_at, processed, created_at
       FROM sms_logs
       WHERE semi_account_id = $1
       ORDER BY received_at DESC`,
      [semiAccountId]
    );

    res.json({
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        semiAccountId: row.semi_account_id,
        phoneNumber: row.phone_number,
        sender: row.sender,
        content: row.content,
        receivedAt: row.received_at,
        processed: row.processed,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Fetch SMS error:', error.message);
    res.status(500).json({ error: 'Failed to fetch SMS messages' });
  }
});

/**
 * GET /api/sms/all
 *
 * Get all SMS messages for the current user (across all semi-accounts)
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const messagesResult = await query(
      `SELECT id, user_id, semi_account_id, phone_number, sender, content, received_at, processed, created_at
       FROM sms_logs
       WHERE user_id = $1
       ORDER BY received_at DESC
       LIMIT 5000`,
      [userId]
    );

    res.json({
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        semiAccountId: row.semi_account_id,
        phoneNumber: row.phone_number,
        sender: row.sender,
        content: row.content,
        receivedAt: row.received_at,
        processed: row.processed,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Fetch all SMS error:', error.message);
    res.status(500).json({ error: 'Failed to fetch SMS messages' });
  }
});

/**
 * POST /api/sms/sync
 *
 * Sync SMS messages from Android app (with attribution)
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let syncedCount = 0;

    for (const msg of messages) {
      const { phoneNumber, sender, content, receivedAt } = msg;

      if (!phoneNumber || !sender || !content || !receivedAt) {
        continue; // Skip invalid messages
      }

      // Find semi-account by phone number
      const semiAccountResult = await query(
        'SELECT id FROM semi_accounts WHERE user_id = $1 AND phone_number = $2',
        [userId, phoneNumber]
      );

      const semiAccountId = semiAccountResult.rows.length > 0 ? semiAccountResult.rows[0].id : null;

      // Insert SMS message
      await query(
        `INSERT INTO sms_logs (user_id, semi_account_id, phone_number, sender, content, received_at, processed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [userId, semiAccountId, phoneNumber, sender, content, receivedAt]
      );

      syncedCount++;
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} messages`,
      syncedCount,
    });
  } catch (error) {
    console.error('SMS sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync SMS messages' });
  }
});

export default router;
