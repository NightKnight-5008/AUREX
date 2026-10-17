import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase, query } from './database.js';
import { authenticateToken, generateToken } from './middleware/auth.js';
import {
  hashPassword,
  comparePassword,
  generateSecurityPassword,
  encrypt,
  decrypt
} from './utils/crypto.js';
import smsRoutes from './routes/sms-routes.js';
import semiAccountRoutes from './routes/semi-account-routes.js';
import transactionRoutes from './routes/transaction-routes.js';
import aiRoutes from './routes/ai-routes.js';
import reminderRoutes from './routes/reminder-routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// ROUTE MODULES
// ============================================================

// SMS and Semi-Account routes
app.use('/api/sms', smsRoutes);
app.use('/api/semi-accounts', semiAccountRoutes);
app.use('/api/transactions', transactionRoutes);

// AI routes (chat proxy, SMS classification, financial analysis)
app.use('/api/ai', aiRoutes);

// Payment reminder routes
app.use('/api/reminders', reminderRoutes);

// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================

// POST /api/auth/register - Create account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, email, created_at`,
      [email, passwordHash]
    );

    const user = result.rows[0];

    // Create default settings for user
    await query(
      `INSERT INTO user_settings (user_id, country, currency, language, theme, created_at, updated_at)
       VALUES ($1, 'US', 'USD', 'en', 'light', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [user.id]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user
    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id);
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Store token in database
    await query(
      `UPDATE users SET auth_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [token, tokenExpiresAt, user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============================================================
// CREDIT CARDS ENDPOINTS
// ============================================================

// GET /api/credit-cards - List all credit cards for user
app.get('/api/credit-cards', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM credit_cards WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      cards: result.rows
    });
  } catch (error) {
    console.error('Get credit cards error:', error.message);
    res.status(500).json({ error: 'Failed to get credit cards' });
  }
});

// POST /api/credit-cards - Create credit card
app.post('/api/credit-cards', authenticateToken, async (req, res) => {
  try {
    const {
      alias_name,
      last_four_digits,
      card_network,
      limit_amount,
      current_balance,
      outstanding_debt,
      minimum_payment,
      due_date,
      payment_status,
      billing_cycle_day
    } = req.body;

    if (!alias_name || !last_four_digits) {
      return res.status(400).json({ error: 'Card name and last four digits required' });
    }

    const result = await query(
      `INSERT INTO credit_cards (
        user_id, alias_name, last_four_digits, card_network, limit_amount,
        current_balance, outstanding_debt, minimum_payment, due_date,
        payment_status, billing_cycle_day, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        req.user.id,
        alias_name,
        last_four_digits,
        card_network || null,
        limit_amount || 0,
        current_balance || 0,
        outstanding_debt || 0,
        minimum_payment || 0,
        due_date || null,
        payment_status || 'active',
        billing_cycle_day || null
      ]
    );

    res.status(201).json({
      message: 'Credit card created',
      card: result.rows[0]
    });
  } catch (error) {
    console.error('Create credit card error:', error.message);
    res.status(500).json({ error: 'Failed to create credit card' });
  }
});

// GET /api/credit-cards/:id - Get credit card
app.get('/api/credit-cards/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM credit_cards WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    res.json({
      card: result.rows[0]
    });
  } catch (error) {
    console.error('Get credit card error:', error.message);
    res.status(500).json({ error: 'Failed to get credit card' });
  }
});

// PUT /api/credit-cards/:id - Update credit card
app.put('/api/credit-cards/:id', authenticateToken, async (req, res) => {
  try {
    const {
      alias_name,
      last_four_digits,
      card_network,
      limit_amount,
      current_balance,
      outstanding_debt,
      minimum_payment,
      due_date,
      payment_status,
      billing_cycle_day
    } = req.body;

    // Verify ownership
    const cardCheck = await query(
      'SELECT id FROM credit_cards WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    const result = await query(
      `UPDATE credit_cards SET
        alias_name = COALESCE($1, alias_name),
        last_four_digits = COALESCE($2, last_four_digits),
        card_network = COALESCE($3, card_network),
        limit_amount = COALESCE($4, limit_amount),
        current_balance = COALESCE($5, current_balance),
        outstanding_debt = COALESCE($6, outstanding_debt),
        minimum_payment = COALESCE($7, minimum_payment),
        due_date = COALESCE($8, due_date),
        payment_status = COALESCE($9, payment_status),
        billing_cycle_day = COALESCE($10, billing_cycle_day),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [
        alias_name,
        last_four_digits,
        card_network,
        limit_amount,
        current_balance,
        outstanding_debt,
        minimum_payment,
        due_date,
        payment_status,
        billing_cycle_day,
        req.params.id,
        req.user.id
      ]
    );

    res.json({
      message: 'Credit card updated',
      card: result.rows[0]
    });
  } catch (error) {
    console.error('Update credit card error:', error.message);
    res.status(500).json({ error: 'Failed to update credit card' });
  }
});

// DELETE /api/credit-cards/:id - Delete credit card
app.delete('/api/credit-cards/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM credit_cards WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    res.json({
      message: 'Credit card deleted',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Delete credit card error:', error.message);
    res.status(500).json({ error: 'Failed to delete credit card' });
  }
});

// ============================================================
// TRANSACTIONS ENDPOINTS
// ============================================================

// GET /api/transactions - List transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { card_id, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM transactions WHERE user_id = $1';
    let params = [req.user.id];

    if (card_id) {
      sql += ' AND card_id = $2';
      params.push(card_id);
    }

    sql += ' ORDER BY transaction_date DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      transactions: result.rows
    });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// POST /api/transactions - Create transaction
app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { card_id, transaction_type, amount, description, category, transaction_date } = req.body;

    if (!transaction_type || !amount) {
      return res.status(400).json({ error: 'Transaction type and amount are required' });
    }

    // Verify card ownership if provided
    if (card_id) {
      const cardCheck = await query(
        'SELECT id FROM credit_cards WHERE id = $1 AND user_id = $2',
        [card_id, req.user.id]
      );

      if (cardCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Credit card not found' });
      }
    }

    const result = await query(
      `INSERT INTO transactions (user_id, card_id, transaction_type, amount, description, category, transaction_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [req.user.id, card_id || null, transaction_type, amount, description || null, category || null, transaction_date || new Date()]
    );

    res.status(201).json({
      message: 'Transaction created',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Create transaction error:', error.message);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// ============================================================
// SMS LOGS ENDPOINTS
// ============================================================

// POST /api/sms/sync - Receive SMS from Android
app.post('/api/sms/sync', authenticateToken, async (req, res) => {
  try {
    const { sender, content, card_id } = req.body;

    if (!sender || !content) {
      return res.status(400).json({ error: 'Sender and content required' });
    }

    const result = await query(
      `INSERT INTO sms_logs (user_id, sender, content, received_at, processed, semi_account_id, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, FALSE, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [req.user.id, sender, content, card_id || null]
    );

    res.status(201).json({
      message: 'SMS logged',
      sms: result.rows[0]
    });
  } catch (error) {
    console.error('SMS sync error:', error.message);
    res.status(500).json({ error: 'Failed to sync SMS' });
  }
});

// GET /api/sms/logs - Get SMS logs
app.get('/api/sms/logs', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0, processed } = req.query;

    let sql = 'SELECT * FROM sms_logs WHERE user_id = $1';
    let params = [req.user.id];

    if (processed !== undefined) {
      sql += ' AND processed = $' + (params.length + 1);
      params.push(processed === 'true');
    }

    sql += ' ORDER BY received_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(sql, params);

    res.json({
      sms_logs: result.rows
    });
  } catch (error) {
    console.error('Get SMS logs error:', error.message);
    res.status(500).json({ error: 'Failed to get SMS logs' });
  }
});

// ============================================================
// USER SETTINGS ENDPOINTS
// ============================================================

// GET /api/settings - Get user settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Get settings error:', error.message);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/settings - Update user settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { country, currency, language, theme } = req.body;

    const result = await query(
      `UPDATE user_settings SET
        country = COALESCE($1, country),
        currency = COALESCE($2, currency),
        language = COALESCE($3, language),
        theme = COALESCE($4, theme),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $5
       RETURNING *`,
      [country, currency, language, theme, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({
      message: 'Settings updated',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Update settings error:', error.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================
// SEMI-ACCOUNTS ENDPOINTS
// ============================================================

// GET /api/semi-accounts - Get semi-accounts from database
app.get('/api/semi-accounts', authenticateToken, async (req, res) => {
  try {
    // Fetch semi-accounts from database
    const result = await query(
      'SELECT id, account_number, username, created_at FROM semi_accounts ORDER BY account_number',
      []
    );

    res.json({
      message: 'Semi-accounts retrieved',
      semi_accounts: result.rows
    });
  } catch (error) {
    console.error('Get semi-accounts error:', error.message);
    res.status(500).json({ error: 'Failed to get semi-accounts' });
  }
});

// ============================================================
// SECURITY CREDENTIALS ENDPOINTS
// ============================================================

// POST /api/security-credentials - Generate security password
app.post('/api/security-credentials', authenticateToken, async (req, res) => {
  try {
    const securityPassword = generateSecurityPassword();

    // Check if credentials already exist
    const existing = await query(
      'SELECT id FROM security_credentials WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await query(
        `UPDATE security_credentials SET security_password = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING *`,
        [securityPassword, req.user.id]
      );
    } else {
      // Create new
      result = await query(
        `INSERT INTO security_credentials (user_id, security_password, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [req.user.id, securityPassword]
      );
    }

    res.status(201).json({
      message: 'Security credentials generated',
      credentials: {
        id: result.rows[0].id,
        user_id: result.rows[0].user_id,
        security_password: result.rows[0].security_password
      }
    });
  } catch (error) {
    console.error('Create security credentials error:', error.message);
    res.status(500).json({ error: 'Failed to generate security credentials' });
  }
});

// GET /api/security-credentials - Get security credentials
app.get('/api/security-credentials', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, user_id, security_password FROM security_credentials WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Security credentials not found' });
    }

    res.json({
      credentials: result.rows[0]
    });
  } catch (error) {
    console.error('Get security credentials error:', error.message);
    res.status(500).json({ error: 'Failed to get security credentials' });
  }
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// SERVER STARTUP
// ============================================================

async function startServer() {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('WARNING: Database initialization failed. The server will run in offline mode.');
    console.error('Error details:', error.message);
  }

  try {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log('API endpoints ready');
    });
  } catch (error) {
    console.error('Failed to start HTTP server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

startServer();
