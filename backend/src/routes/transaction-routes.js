import express from 'express';
import multer from 'multer';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage (to convert to base64)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
});

// Helper function to convert file buffer to base64 data URI
function bufferToBase64DataURI(buffer, mimetype) {
  const base64 = buffer.toString('base64');
  return `data:${mimetype};base64,${base64}`;
}

// All routes require authentication
router.use(authenticateToken);

// GET /api/transactions - Get all user transactions
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC, created_at DESC`,
      [userId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM transactions
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: result.rows[0] });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { transaction_type, amount, description, category, card_id, transaction_date } = req.body;

    // Validate required fields
    if (!transaction_type || !amount) {
      return res.status(400).json({ error: 'Transaction type and amount are required' });
    }

    // Convert uploaded file to base64 data URI
    const photoData = req.file ? bufferToBase64DataURI(req.file.buffer, req.file.mimetype) : null;

    const result = await query(
      `INSERT INTO transactions
       (user_id, card_id, transaction_type, amount, description, category, photo_data, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, card_id || null, transaction_type, amount, description || null, category || null, photoData, transaction_date || new Date()]
    );

    res.status(201).json({
      transaction: result.rows[0],
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id - Update existing transaction
router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { transaction_type, amount, description, category, card_id, transaction_date } = req.body;

    // Check if transaction exists and belongs to user
    const existingResult = await query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existingTransaction = existingResult.rows[0];
    let photoData = existingTransaction.photo_data;

    // Handle new photo upload (convert to base64)
    if (req.file) {
      photoData = bufferToBase64DataURI(req.file.buffer, req.file.mimetype);
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (transaction_type !== undefined) {
      updates.push(`transaction_type = $${paramCount++}`);
      values.push(transaction_type);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramCount++}`);
      values.push(amount);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (card_id !== undefined) {
      updates.push(`card_id = $${paramCount++}`);
      values.push(card_id || null);
    }
    if (transaction_date !== undefined) {
      updates.push(`transaction_date = $${paramCount++}`);
      values.push(transaction_date);
    }
    if (photoData !== existingTransaction.photo_data) {
      updates.push(`photo_data = $${paramCount++}`);
      values.push(photoData);
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause parameters
    values.push(id, userId);

    const updateQuery = `
      UPDATE transactions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    res.json({
      transaction: result.rows[0],
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check if transaction exists and belongs to user
    const existingResult = await query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Delete transaction (photo data is stored in DB and will be deleted automatically)
    await query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
