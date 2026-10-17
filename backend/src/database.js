import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export let isOffline = false;

// In-memory mock database store for offline dev fallback
const mockStore = {
  users: [],
  user_settings: [],
  credit_cards: [],
  transactions: [],
  sms_logs: [],
  security_credentials: [],
  semi_accounts: []
};

function runMockQuery(text, params) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  // 1. SELECT id FROM users WHERE email = $1
  if (normalized.startsWith('SELECT id FROM users WHERE email = $1')) {
    const email = params[0];
    const user = mockStore.users.find(u => u.email === email);
    return { rows: user ? [{ id: user.id }] : [], rowCount: user ? 1 : 0 };
  }

  // 2. SELECT id, email, password_hash FROM users WHERE email = $1
  if (normalized.startsWith('SELECT id, email, password_hash FROM users WHERE email = $1') ||
      normalized.startsWith('SELECT id, email, password_hash FROM users WHERE email = $2')) {
    const email = params[0] || params[1];
    const user = mockStore.users.find(u => u.email === email);
    return { rows: user ? [{ id: user.id, email: user.email, password_hash: user.password_hash }] : [], rowCount: user ? 1 : 0 };
  }

  // 3. SELECT id, email, created_at, updated_at FROM users WHERE id = $1
  if (normalized.startsWith('SELECT id, email, created_at, updated_at FROM users WHERE id = $1')) {
    const id = params[0];
    const user = mockStore.users.find(u => u.id === id);
    return { rows: user ? [{ id: user.id, email: user.email, created_at: user.created_at, updated_at: user.updated_at }] : [], rowCount: user ? 1 : 0 };
  }

  // 4. INSERT INTO users (email, password_hash, created_at, updated_at) VALUES ($1, $2, ...
  if (normalized.startsWith('INSERT INTO users')) {
    const email = params[0];
    const password_hash = params[1];
    const newUser = {
      id: `user_${Date.now()}`,
      email,
      password_hash,
      created_at: new Date(),
      updated_at: new Date(),
      auth_token: null,
      token_expires_at: null
    };
    mockStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // 5. INSERT INTO user_settings
  if (normalized.startsWith('INSERT INTO user_settings')) {
    const user_id = params[0];
    const newSettings = {
      id: `settings_${Date.now()}`,
      user_id,
      country: 'US',
      currency: 'USD',
      language: 'en',
      theme: 'light',
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.user_settings.push(newSettings);
    return { rows: [newSettings], rowCount: 1 };
  }

  // 6a. SELECT id, email, is_admin FROM users WHERE id = $1 AND auth_token = $2
  if (normalized.includes('FROM users WHERE id = $1 AND auth_token')) {
    const id = params[0];
    const token = params[1];
    const user = mockStore.users.find(u => u.id === id && u.auth_token === token);
    return { rows: user ? [{ id: user.id, email: user.email, is_admin: user.is_admin || false }] : [], rowCount: user ? 1 : 0 };
  }

  // 6. UPDATE users SET auth_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3
  if (normalized.startsWith('UPDATE users SET auth_token = $1, token_expires_at = $2')) {
    const auth_token = params[0];
    const token_expires_at = params[1];
    const id = params[2];
    const user = mockStore.users.find(u => u.id === id);
    if (user) {
      user.auth_token = auth_token;
      user.token_expires_at = token_expires_at;
    }
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
  }

  // 7. SELECT * FROM credit_cards WHERE user_id = $1
  if (normalized.startsWith('SELECT * FROM credit_cards WHERE user_id = $1') || normalized.includes('FROM credit_cards WHERE user_id = $1')) {
    const user_id = params[0];
    const cards = mockStore.credit_cards.filter(c => c.user_id === user_id);
    return { rows: cards, rowCount: cards.length };
  }

  // 8. INSERT INTO credit_cards (with new column names)
  if (normalized.startsWith('INSERT INTO credit_cards')) {
    const newCard = {
      id: `card_${Date.now()}`,
      user_id: params[0],
      alias_name: params[1],
      last_four_digits: params[2],
      card_network: params[3] || null,
      limit_amount: params[4] || 0,
      current_balance: params[5] || 0,
      outstanding_debt: params[6] || 0,
      minimum_payment: params[7] || 0,
      due_date: params[8] || null,
      payment_status: params[9] || 'active',
      billing_cycle_day: params[10] || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.credit_cards.push(newCard);
    return { rows: [newCard], rowCount: 1 };
  }

  // 9. SELECT * FROM transactions WHERE user_id = $1
  if (normalized.startsWith('SELECT * FROM transactions WHERE user_id = $1') || normalized.includes('FROM transactions WHERE user_id = $1')) {
    const user_id = params[0];
    const txs = mockStore.transactions.filter(t => t.user_id === user_id);
    return { rows: txs, rowCount: txs.length };
  }

  // 10. INSERT INTO transactions
  if (normalized.startsWith('INSERT INTO transactions')) {
    const newTx = {
      id: `tx_${Date.now()}`,
      user_id: params[0],
      card_id: params[1],
      transaction_type: params[2],
      amount: params[3],
      description: params[4] || null,
      category: params[5] || null,
      photo_data: params[6] || null,
      transaction_date: params[7] || new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.transactions.push(newTx);
    return { rows: [newTx], rowCount: 1 };
  }

  // 11. SELECT * FROM sms_logs WHERE user_id = $1
  if (normalized.startsWith('SELECT * FROM sms_logs WHERE user_id = $1') || normalized.includes('FROM sms_logs WHERE user_id = $1')) {
    const user_id = params[0];
    const logs = mockStore.sms_logs.filter(s => s.user_id === user_id);
    return { rows: logs, rowCount: logs.length };
  }

  // 12. INSERT INTO sms_logs
  if (normalized.startsWith('INSERT INTO sms_logs')) {
    const newSms = {
      id: `sms_${Date.now()}`,
      user_id: params[0],
      sender: params[1],
      content: params[2],
      card_id: params[3],
      received_at: new Date(),
      processed: false,
      created_at: new Date()
    };
    mockStore.sms_logs.push(newSms);
    return { rows: [newSms], rowCount: 1 };
  }

  // 13. SELECT * FROM user_settings WHERE user_id = $1
  if (normalized.startsWith('SELECT * FROM user_settings WHERE user_id = $1') || normalized.includes('FROM user_settings WHERE user_id = $1')) {
    const user_id = params[0];
    const settings = mockStore.user_settings.find(s => s.user_id === user_id);
    return { rows: settings ? [settings] : [], rowCount: settings ? 1 : 0 };
  }

  // 14. UPDATE user_settings
  if (normalized.startsWith('UPDATE user_settings SET') || normalized.includes('UPDATE user_settings')) {
    const user_id = params[4];
    let settings = mockStore.user_settings.find(s => s.user_id === user_id);
    if (!settings) {
      settings = {
        id: `settings_${Date.now()}`,
        user_id,
        country: params[0],
        currency: params[1],
        language: params[2],
        theme: params[3],
        created_at: new Date(),
        updated_at: new Date()
      };
      mockStore.user_settings.push(settings);
    } else {
      settings.country = params[0] || settings.country;
      settings.currency = params[1] || settings.currency;
      settings.language = params[2] || settings.language;
      settings.theme = params[3] || settings.theme;
      settings.updated_at = new Date();
    }
    return { rows: [settings], rowCount: 1 };
  }

  // 15. SELECT id, account_number, username, created_at FROM semi_accounts
  if (normalized.startsWith('SELECT id, account_number, username, created_at FROM semi_accounts') || normalized.includes('FROM semi_accounts')) {
    return { rows: mockStore.semi_accounts, rowCount: mockStore.semi_accounts.length };
  }

  // 16. SELECT id, user_id, security_password FROM security_credentials WHERE user_id = $1
  if (normalized.startsWith('SELECT id, user_id, security_password FROM security_credentials WHERE user_id = $1') || normalized.includes('FROM security_credentials WHERE user_id = $1')) {
    const user_id = params[0];
    const creds = mockStore.security_credentials.filter(c => c.user_id === user_id);
    return { rows: creds, rowCount: creds.length };
  }

  // 17. INSERT INTO security_credentials
  if (normalized.startsWith('INSERT INTO security_credentials')) {
    const newCreds = {
      id: `creds_${Date.now()}`,
      user_id: params[0],
      security_password: params[1],
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.security_credentials.push(newCreds);
    return { rows: [newCreds], rowCount: 1 };
  }

  // 18. UPDATE security_credentials
  if (normalized.startsWith('UPDATE security_credentials SET') || normalized.includes('UPDATE security_credentials')) {
    const security_password = params[0];
    const user_id = params[1];
    const cred = mockStore.security_credentials.find(c => c.user_id === user_id);
    if (cred) {
      cred.security_password = security_password;
      cred.updated_at = new Date();
    }
    return { rows: cred ? [cred] : [], rowCount: cred ? 1 : 0 };
  }

  // Default fallback for any unhandled queries (return empty rows)
  return { rows: [], rowCount: 0 };
}

// Initialize database schema
export async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    isOffline = false;
  } catch (error) {
    isOffline = true;
    console.error('Database connection failed, switching to in-memory offline fallback.');
    throw error;
  }

  try {
    // Create UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        auth_token VARCHAR(500),
        token_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create credit_cards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_cards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_name VARCHAR(100) NOT NULL,
        last_four VARCHAR(4) NOT NULL,
        card_network VARCHAR(50),
        credit_limit DECIMAL(15, 2),
        available_balance DECIMAL(15, 2),
        outstanding_debt DECIMAL(15, 2),
        minimum_payment DECIMAL(15, 2),
        due_date INT,
        payment_status VARCHAR(50),
        billing_cycle_day INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description VARCHAR(255),
        category VARCHAR(100),
        photo_data TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate existing photo_url column to photo_data if it exists
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='transactions' AND column_name='photo_url'
        ) THEN
          ALTER TABLE transactions RENAME COLUMN photo_url TO photo_data;
        END IF;
      END $$;
    `);

    // Create sms_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        semi_account_id UUID REFERENCES semi_accounts(id) ON DELETE SET NULL,
        phone_number VARCHAR(20),
        content TEXT,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE,
        card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        country VARCHAR(100),
        currency VARCHAR(10),
        language VARCHAR(10),
        theme VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create semi_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS semi_accounts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create security_credentials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_credentials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        security_password VARCHAR(24) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_logs_semi_account_id ON sms_logs(semi_account_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_semi_accounts_user_id ON semi_accounts(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Execute a query
export async function query(text, params) {
  const start = Date.now();
  try {
    if (isOffline) {
      const result = runMockQuery(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed mock query (offline mode)', { text, duration, rows: result.rowCount });
      }
      return result;
    }
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// Get a client from the pool
export async function getClient() {
  if (isOffline) {
    return {
      query: async (text, params) => runMockQuery(text, params),
      release: () => {}
    };
  }
  return pool.connect();
}

// Close the pool
export async function closePool() {
  if (!isOffline) {
    await pool.end();
  }
  console.log('Database pool closed');
}

export default pool;
