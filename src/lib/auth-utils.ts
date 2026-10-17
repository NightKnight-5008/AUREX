/**
 * Authentication utilities for user management
 * Provides password hashing, token generation, and validation
 */

/**
 * Simple hash function for password (browser-compatible)
 * In production, use bcrypt or similar server-side
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate a random 24-character password for Android app
 * Contains uppercase (A-Z), lowercase (a-z), and numbers (0-9)
 */
export function generateAndroidPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = uppercase + lowercase + numbers;

  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  // Fill remaining 21 characters randomly
  for (let i = 0; i < 21; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to randomize position of guaranteed characters
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate authentication token (JWT-like)
 */
export function generateAuthToken(userId: string): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${userId}.${randomPart}`;
}

/**
 * Calculate token expiration timestamp (30 days from now)
 */
export function getTokenExpiration(): string {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  return Math.floor(expirationDate.getTime() / 1000).toString();
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const expirationTimestamp = parseInt(expiresAt, 10);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return currentTimestamp >= expirationTimestamp;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength (min 8 characters)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get verification code expiration timestamp (10 minutes from now)
 */
export function getVerificationCodeExpiration(): string {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 10);
  return Math.floor(expirationDate.getTime() / 1000).toString();
}

/**
 * Check if verification code is expired
 */
export function isVerificationCodeExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const expirationTimestamp = parseInt(expiresAt, 10);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return currentTimestamp >= expirationTimestamp;
}

/**
 * Send verification email (simulated - logs to console)
 * In production, this would integrate with an email service like SendGrid, AWS SES, etc.
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    console.log('='.repeat(60));
    console.log('📧 EMAIL VERIFICATION CODE');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    console.log(`Subject: Verify Your Email Address`);
    console.log('');
    console.log(`Your verification code is: ${code}`);
    console.log('');
    console.log('This code will expire in 10 minutes.');
    console.log('='.repeat(60));

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}
