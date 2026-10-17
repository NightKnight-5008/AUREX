import crypto from 'crypto';
import bcryptjs from 'bcryptjs';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-change!!';
const ALGORITHM = 'aes-256-cbc';

// Hash password using bcrypt
export async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

// Compare password with hash
export async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

// Generate random string
export function generateRandomString(length) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// Generate semi-account username (30 characters)
export function generateSemiAccountUsername() {
  return `user_${generateRandomString(25)}`;
}

// Generate semi-account password (50 characters)
export function generateSemiAccountPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 50; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate security password (24 characters)
export function generateSecurityPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Encrypt data
export function encrypt(data) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt data
export function decrypt(encryptedData) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const [iv, encrypted] = encryptedData.split(':');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export default {
  hashPassword,
  comparePassword,
  generateRandomString,
  generateSemiAccountUsername,
  generateSemiAccountPassword,
  generateSecurityPassword,
  encrypt,
  decrypt
};
