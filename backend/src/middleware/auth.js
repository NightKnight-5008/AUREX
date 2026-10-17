import jwt from 'jsonwebtoken';
import { query } from '../database.js';

// SECURITY: JWT_SECRET must be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  console.error('Please set JWT_SECRET in your .env file with a strong random string');
  process.exit(1);
}

const TOKEN_EXPIRY = '24h';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = await verifyToken(token);

    // Verify token exists in database
    const result = await query(
      'SELECT id, email, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1 AND auth_token = $2',
      [decoded.userId, token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      isAdmin: result.rows[0].is_admin || false,
      token
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Admin authentication middleware
export async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = await verifyToken(token);

    // Verify token exists in database and user is admin
    const result = await query(
      'SELECT id, email, is_admin FROM users WHERE id = $1 AND auth_token = $2',
      [decoded.userId, token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }

    if (!result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      isAdmin: true,
      token
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default {
  generateToken,
  verifyToken,
  authenticateToken,
  authenticateAdmin
};
