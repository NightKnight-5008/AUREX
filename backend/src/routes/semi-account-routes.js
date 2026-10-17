import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// SEMI-ACCOUNT MANAGEMENT ENDPOINTS
// ============================================================

/**
 * GET /api/semi-accounts
 *
 * Get all semi-accounts for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT id, user_id, name, phone_number, created_at, updated_at
       FROM semi_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      semiAccounts: result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        phoneNumber: row.phone_number,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error('Fetch semi-accounts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch semi-accounts' });
  }
});

/**
 * POST /api/semi-accounts
 *
 * Create a new semi-account
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if phone number is already used by another semi-account of this user
    if (phoneNumber) {
      const existingResult = await query(
        'SELECT id FROM semi_accounts WHERE user_id = $1 AND phone_number = $2',
        [userId, phoneNumber]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({
          error: 'Phone number already associated with another semi-account',
        });
      }
    }

    const result = await query(
      `INSERT INTO semi_accounts (user_id, name, phone_number, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, user_id, name, phone_number, created_at, updated_at`,
      [userId, name.trim(), phoneNumber || null]
    );

    const semiAccount = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Semi-account created successfully',
      semiAccount: {
        id: semiAccount.id,
        userId: semiAccount.user_id,
        name: semiAccount.name,
        phoneNumber: semiAccount.phone_number,
        createdAt: semiAccount.created_at,
        updatedAt: semiAccount.updated_at,
      },
    });
  } catch (error) {
    console.error('Create semi-account error:', error.message);
    res.status(500).json({ error: 'Failed to create semi-account' });
  }
});

/**
 * PUT /api/semi-accounts/:id
 *
 * Update an existing semi-account
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Verify ownership
    const ownershipResult = await query(
      'SELECT id FROM semi_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Semi-account not found or access denied' });
    }

    // Check if phone number is already used by another semi-account of this user
    if (phoneNumber) {
      const existingResult = await query(
        'SELECT id FROM semi_accounts WHERE user_id = $1 AND phone_number = $2 AND id != $3',
        [userId, phoneNumber, id]
      );

      if (existingResult.rows.length > 0) {
        return res.status(409).json({
          error: 'Phone number already associated with another semi-account',
        });
      }
    }

    const result = await query(
      `UPDATE semi_accounts
       SET name = $1, phone_number = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING id, user_id, name, phone_number, created_at, updated_at`,
      [name.trim(), phoneNumber || null, id, userId]
    );

    const semiAccount = result.rows[0];

    res.json({
      success: true,
      message: 'Semi-account updated successfully',
      semiAccount: {
        id: semiAccount.id,
        userId: semiAccount.user_id,
        name: semiAccount.name,
        phoneNumber: semiAccount.phone_number,
        createdAt: semiAccount.created_at,
        updatedAt: semiAccount.updated_at,
      },
    });
  } catch (error) {
    console.error('Update semi-account error:', error.message);
    res.status(500).json({ error: 'Failed to update semi-account' });
  }
});

/**
 * DELETE /api/semi-accounts/:id
 *
 * Delete a semi-account (and optionally its SMS logs)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const ownershipResult = await query(
      'SELECT id FROM semi_accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Semi-account not found or access denied' });
    }

    // Delete semi-account (SMS logs will have semi_account_id set to NULL due to ON DELETE SET NULL)
    await query('DELETE FROM semi_accounts WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({
      success: true,
      message: 'Semi-account deleted successfully',
    });
  } catch (error) {
    console.error('Delete semi-account error:', error.message);
    res.status(500).json({ error: 'Failed to delete semi-account' });
  }
});

export default router;
