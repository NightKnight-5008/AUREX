/**
 * Security Password Management System
 *
 * Generates and manages the 24-character security password used for:
 * - Semi-account credential regeneration
 * - Security-critical confirmations
 * - Sensitive actions authorization
 *
 * CRITICAL: This password is DISTINCT from:
 * - Semi-account usernames (30 chars)
 * - Semi-account passwords (50 chars)
 * - Main account password
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SecurityPasswordConfig {
  password: string;           // 24-character security password (plaintext)
  passwordHash: string;       // SHA-256 hash for verification
  createdAt: string;          // ISO timestamp
  lastUsed: string | null;    // Last time password was used
  regenerationCount: number;  // How many times password has been regenerated
}

export interface SecurityPasswordVerification {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Character Sets for Password Generation
// ============================================================================

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()-_=+';

const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL_CHARS;

// ============================================================================
// Password Generation
// ============================================================================

/**
 * Generate cryptographically secure 24-character security password
 * Ensures at least one character from each character set
 */
export function generateSecurityPassword(): string {
  const LENGTH = 24;
  const array = new Uint8Array(LENGTH);
  window.crypto.getRandomValues(array);

  // Convert to characters from allowed set
  let result = '';
  for (let i = 0; i < LENGTH; i++) {
    result += ALL_CHARS[array[i] % ALL_CHARS.length];
  }

  // Ensure at least one of each type (replace first 4 chars)
  const ensureChars = [
    UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
    LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
    NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
    SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)],
  ];

  // Shuffle the ensure chars into random positions within first 24 chars
  const positions = Array.from({ length: 4 }, (_, i) => i).sort(() => Math.random() - 0.5);
  for (let i = 0; i < ensureChars.length; i++) {
    const chars = result.split('');
    chars[positions[i]] = ensureChars[i];
    result = chars.join('');
  }

  return result;
}

// ============================================================================
// Password Hashing and Verification
// ============================================================================

/**
 * Hash security password using SHA-256
 */
export async function hashSecurityPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify security password against stored hash
 */
export async function verifySecurityPassword(
  inputPassword: string,
  storedPasswordHash: string
): Promise<SecurityPasswordVerification> {
  if (!inputPassword || inputPassword.length !== 24) {
    return {
      isValid: false,
      error: 'Security password must be exactly 24 characters',
    };
  }

  const inputHash = await hashSecurityPassword(inputPassword);
  const isValid = inputHash === storedPasswordHash;

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid security password',
    };
  }

  return { isValid: true };
}

// ============================================================================
// Password Configuration Management
// ============================================================================

/**
 * Create initial security password configuration
 */
export async function createSecurityPasswordConfig(): Promise<SecurityPasswordConfig> {
  const password = generateSecurityPassword();
  const passwordHash = await hashSecurityPassword(password);

  return {
    password,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    regenerationCount: 0,
  };
}

/**
 * Regenerate security password
 * Returns new password and updated configuration
 */
export async function regenerateSecurityPassword(
  currentConfig: SecurityPasswordConfig
): Promise<SecurityPasswordConfig> {
  const newPassword = generateSecurityPassword();
  const newPasswordHash = await hashSecurityPassword(newPassword);

  return {
    password: newPassword,
    passwordHash: newPasswordHash,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    regenerationCount: currentConfig.regenerationCount + 1,
  };
}

/**
 * Update last used timestamp
 */
export function updateSecurityPasswordUsage(
  config: SecurityPasswordConfig
): SecurityPasswordConfig {
  return {
    ...config,
    lastUsed: new Date().toISOString(),
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate security password format
 */
export function validateSecurityPasswordFormat(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length !== 24) {
    errors.push('Must be exactly 24 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Must contain at least one number');
  }

  if (!/[!@#$%^&*()\-_=+]/.test(password)) {
    errors.push('Must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if password is distinct from semi-account credentials
 */
export function ensureDistinctFromSemiAccounts(
  securityPassword: string,
  semiAccountUsernames: string[],
  semiAccountPasswords: string[]
): boolean {
  // Check if security password matches any semi-account username
  if (semiAccountUsernames.includes(securityPassword)) {
    return false;
  }

  // Check if security password matches any semi-account password
  if (semiAccountPasswords.includes(securityPassword)) {
    return false;
  }

  return true;
}

// ============================================================================
// Encryption Integration
// ============================================================================

/**
 * Encrypt security password for storage
 * Uses same encryption system as other sensitive data
 */
export async function encryptSecurityPassword(
  password: string,
  publicKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    publicKey,
    data
  );

  const encryptedArray = Array.from(new Uint8Array(encrypted));
  return btoa(String.fromCharCode(...encryptedArray));
}

/**
 * Decrypt security password from storage
 */
export async function decryptSecurityPassword(
  encryptedPassword: string,
  privateKey: CryptoKey
): Promise<string> {
  const encryptedData = Uint8Array.from(atob(encryptedPassword), c => c.charCodeAt(0));

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ============================================================================
// Security Logging
// ============================================================================

export interface SecurityPasswordAuditLog {
  id: string;
  userId: string;
  action: 'generated' | 'regenerated' | 'verified' | 'failed_verification' | 'copied';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create audit log entry for security password action
 */
export function createSecurityPasswordAuditLog(
  userId: string,
  action: SecurityPasswordAuditLog['action'],
  metadata?: Record<string, unknown>
): SecurityPasswordAuditLog {
  return {
    id: crypto.randomUUID(),
    userId,
    action,
    timestamp: new Date().toISOString(),
    ipAddress: undefined, // Would be populated by backend
    userAgent: navigator.userAgent,
    metadata,
  };
}
