/**
 * Phone Number Encryption Utilities
 *
 * Provides AES-256-GCM encryption for phone numbers at rest
 *
 * SECURITY:
 * - Uses AES-256-GCM for authenticated encryption
 * - Encryption key stored in environment variables only
 * - Each encryption uses a unique IV (Initialization Vector)
 * - Authenticated encryption prevents tampering
 *
 * @module phone-encryption
 */

import * as crypto from 'crypto';

/**
 * Encryption algorithm configuration
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 *
 * @returns Encryption key as Buffer
 * @throws Error if key not set or invalid length
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PHONE_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('PHONE_ENCRYPTION_KEY environment variable not set');
  }

  // Derive 256-bit key from environment variable
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypted phone number format
 */
export interface EncryptedPhone {
  encrypted: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded IV
  authTag: string; // Base64-encoded authentication tag
}

/**
 * Encrypt a phone number
 *
 * @param phoneNumber - Plain text phone number (e.g., "+1234567890")
 * @returns Encrypted phone data with IV and auth tag
 *
 * @example
 * ```typescript
 * const encrypted = encryptPhoneNumber('+1234567890');
 * // Store encrypted.encrypted, encrypted.iv, encrypted.authTag in database
 * ```
 */
export function encryptPhoneNumber(phoneNumber: string): EncryptedPhone {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    throw new Error('Phone number cannot be empty');
  }

  // Get encryption key
  const key = getEncryptionKey();

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt phone number
  let encrypted = cipher.update(phoneNumber, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt a phone number
 *
 * @param encryptedData - Encrypted phone data with IV and auth tag
 * @returns Plain text phone number
 * @throws Error if decryption fails (tampered data or wrong key)
 *
 * @example
 * ```typescript
 * const phoneNumber = decryptPhoneNumber({
 *   encrypted: 'base64data',
 *   iv: 'base64iv',
 *   authTag: 'base64tag'
 * });
 * // phoneNumber = '+1234567890'
 * ```
 */
export function decryptPhoneNumber(encryptedData: EncryptedPhone): string {
  if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
    throw new Error('Invalid encrypted phone data: missing required fields');
  }

  // Get encryption key
  const key = getEncryptionKey();

  // Parse IV and auth tag
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');
  const encrypted = Buffer.from(encryptedData.encrypted, 'base64');

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt phone number
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt phone number to database format
 *
 * Combines encrypted data, IV, and auth tag into single string
 * Format: encrypted$iv$authTag (base64 encoded components)
 *
 * @param phoneNumber - Plain text phone number
 * @returns Combined encrypted string for database storage
 *
 * @example
 * ```typescript
 * const dbValue = encryptPhoneForDB('+1234567890');
 * // Store dbValue in phone_number_encrypted column
 * ```
 */
export function encryptPhoneForDB(phoneNumber: string): string {
  const encrypted = encryptPhoneNumber(phoneNumber);
  return `${encrypted.encrypted}$${encrypted.iv}$${encrypted.authTag}`;
}

/**
 * Decrypt phone number from database format
 *
 * @param dbValue - Combined encrypted string from database
 * @returns Plain text phone number
 *
 * @example
 * ```typescript
 * const phoneNumber = decryptPhoneFromDB(dbValue);
 * // phoneNumber = '+1234567890'
 * ```
 */
export function decryptPhoneFromDB(dbValue: string): string {
  if (!dbValue || !dbValue.includes('$')) {
    throw new Error('Invalid database phone format');
  }

  const parts = dbValue.split('$');

  if (parts.length !== 3) {
    throw new Error('Invalid database phone format: expected 3 parts');
  }

  return decryptPhoneNumber({
    encrypted: parts[0],
    iv: parts[1],
    authTag: parts[2],
  });
}

/**
 * Validate phone number format
 *
 * @param phoneNumber - Phone number to validate
 * @returns True if valid E.164 format
 *
 * @example
 * ```typescript
 * validatePhoneNumber('+1234567890') // true
 * validatePhoneNumber('123456') // false
 * validatePhoneNumber('+1 (234) 567-8900') // false (contains formatting)
 * ```
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +14155552671
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Sanitize phone number to E.164 format
 *
 * Removes spaces, parentheses, dashes, and ensures + prefix
 *
 * @param phoneNumber - Phone number in any format
 * @param defaultCountryCode - Default country code if not provided (default: '+1')
 * @returns E.164 formatted phone number
 *
 * @example
 * ```typescript
 * sanitizePhoneNumber('(123) 456-7890', '+1') // '+11234567890'
 * sanitizePhoneNumber('+1 234 567 8900') // '+12345678900'
 * sanitizePhoneNumber('1234567890', '+1') // '+11234567890'
 * ```
 */
export function sanitizePhoneNumber(
  phoneNumber: string,
  defaultCountryCode: string = '+1'
): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Ensure + prefix
  if (!cleaned.startsWith('+')) {
    // If it starts with country code without +, add +
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+' + cleaned;
    } else {
      // Add default country code
      cleaned = defaultCountryCode + cleaned;
    }
  }

  return cleaned;
}

/**
 * Hash phone number for logging/comparison
 *
 * Creates a one-way hash for privacy-safe logging
 * Never log actual phone numbers - use this instead
 *
 * @param phoneNumber - Phone number to hash
 * @returns SHA-256 hash (first 16 characters)
 *
 * @example
 * ```typescript
 * const hash = hashPhoneNumber('+1234567890');
 * console.log(`Sent reminder to ${hash}`); // Safe for logs
 * ```
 */
export function hashPhoneNumber(phoneNumber: string): string {
  return crypto
    .createHash('sha256')
    .update(phoneNumber)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Redact phone number for display
 *
 * Shows only country code and last 4 digits
 *
 * @param phoneNumber - Phone number to redact
 * @returns Redacted phone number (e.g., "+1 ****7890")
 *
 * @example
 * ```typescript
 * redactPhoneNumber('+12345678900') // '+1 ****8900'
 * ```
 */
export function redactPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length < 5) {
    return '****';
  }

  const lastFour = phoneNumber.slice(-4);

  // Extract country code (everything before last 10 digits)
  const countryCode = phoneNumber.slice(0, -10);

  return `${countryCode} ****${lastFour}`;
}

/**
 * Generate encryption key for environment variable
 *
 * Run this once during setup to generate a secure key
 *
 * @returns Random 256-bit key as hex string
 *
 * @example
 * ```typescript
 * const key = generateEncryptionKey();
 * // Add to .env: PHONE_ENCRYPTION_KEY=<key>
 * ```
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
