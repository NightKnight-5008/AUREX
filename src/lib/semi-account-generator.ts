/**
 * Semi-Account Credential Generation System
 *
 * Generates four isolated sub-accounts per main user account
 * Each semi-account has:
 * - Unique 30-character username (uppercase, lowercase, numbers, special chars)
 * - Unique 50-character password (same character set)
 * - Isolation from main account credentials
 * - Link to one of four phone numbers
 *
 * These credentials are embedded in per-account APKs for automatic Android login
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SemiAccount {
  id: string;                    // Unique identifier (UUID)
  parentUserId: string;          // Main account user ID
  username: string;              // 30-character unique username
  passwordHash: string;          // SHA-256 hash of 50-character password
  phoneNumberIndex: 1 | 2 | 3 | 4; // Which phone number this semi-account manages
  phoneNumber: string;           // Actual phone number
  phoneLabel: string;            // User-defined label for this phone
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;             // ISO timestamp
  lastUsed: string | null;       // Last authentication timestamp
}

export interface SemiAccountCredentials {
  semiAccountId: string;
  username: string;              // 30 characters
  password: string;              // 50 characters (raw, not hashed)
  phoneNumberIndex: 1 | 2 | 3 | 4;
}

export interface SemiAccountSet {
  mainUserId: string;
  semiAccounts: SemiAccount[];
  credentials: SemiAccountCredentials[]; // For APK embedding only
}

// ============================================================================
// Character Sets for Credential Generation
// ============================================================================

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL_CHARS = '!@#$%^&*()-_=+[]{}|;:,.<>?';

const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL_CHARS;

// ============================================================================
// Credential Generation Functions
// ============================================================================

/**
 * Generate cryptographically secure random string
 * Ensures at least one character from each character set
 */
function generateSecureRandomString(length: number): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  // Convert to characters from allowed set
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALL_CHARS[array[i] % ALL_CHARS.length];
  }

  // Ensure at least one of each type (replace first 4 chars)
  const ensureChars = [
    UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)],
    LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)],
    NUMBERS[Math.floor(Math.random() * NUMBERS.length)],
    SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)],
  ];

  // Shuffle the ensure chars into random positions
  const positions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  for (let i = 0; i < ensureChars.length; i++) {
    const chars = result.split('');
    chars[positions[i]] = ensureChars[i];
    result = chars.join('');
  }

  return result;
}

/**
 * Generate 30-character username
 * Format: Uppercase + Lowercase + Numbers + Special Characters
 */
export function generateSemiAccountUsername(): string {
  return generateSecureRandomString(30);
}

/**
 * Generate 50-character password
 * Format: Uppercase + Lowercase + Numbers + Special Characters
 */
export function generateSemiAccountPassword(): string {
  return generateSecureRandomString(50);
}

/**
 * Generate UUID for semi-account ID
 */
function generateSemiAccountId(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);

  // Set version (4) and variant bits
  array[6] = (array[6] & 0x0f) | 0x40;
  array[8] = (array[8] & 0x3f) | 0x80;

  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Hash password using SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Semi-Account Set Generation
// ============================================================================

/**
 * Generate complete set of 4 semi-accounts for a main user
 * Each semi-account is linked to one of four phone numbers
 */
export async function generateSemiAccountSet(
  mainUserId: string,
  phoneNumbers: Array<{ number: string; label: string }>
): Promise<SemiAccountSet> {
  if (phoneNumbers.length !== 4) {
    throw new Error('Exactly 4 phone numbers required for semi-account generation');
  }

  const semiAccounts: SemiAccount[] = [];
  const credentials: SemiAccountCredentials[] = [];

  for (let i = 0; i < 4; i++) {
    const phoneIndex = (i + 1) as 1 | 2 | 3 | 4;
    const semiAccountId = generateSemiAccountId();
    const username = generateSemiAccountUsername();
    const password = generateSemiAccountPassword();
    const passwordHash = await hashPassword(password);

    const semiAccount: SemiAccount = {
      id: semiAccountId,
      parentUserId: mainUserId,
      username,
      passwordHash,
      phoneNumberIndex: phoneIndex,
      phoneNumber: phoneNumbers[i].number,
      phoneLabel: phoneNumbers[i].label,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUsed: null,
    };

    const credential: SemiAccountCredentials = {
      semiAccountId,
      username,
      password, // Raw password for APK embedding
      phoneNumberIndex: phoneIndex,
    };

    semiAccounts.push(semiAccount);
    credentials.push(credential);
  }

  return {
    mainUserId,
    semiAccounts,
    credentials,
  };
}

/**
 * Verify semi-account credentials
 */
export async function verifySemiAccountCredentials(
  username: string,
  password: string,
  storedPasswordHash: string
): Promise<boolean> {
  const inputPasswordHash = await hashPassword(password);
  return inputPasswordHash === storedPasswordHash;
}

// ============================================================================
// APK Credential Embedding
// ============================================================================

/**
 * Prepare credentials for APK embedding
 * Returns JSON string that will be embedded in APK assets
 */
export function prepareCredentialsForAPK(semiAccountSet: SemiAccountSet): string {
  const apkCredentials = {
    mainUserId: semiAccountSet.mainUserId,
    generatedAt: new Date().toISOString(),
    semiAccounts: semiAccountSet.credentials.map(cred => ({
      username: cred.username,
      password: cred.password,
      phoneIndex: cred.phoneNumberIndex,
    })),
  };

  return JSON.stringify(apkCredentials, null, 2);
}

/**
 * Parse embedded credentials from APK
 * (This would be used in the Android app)
 */
export function parseEmbeddedCredentials(jsonString: string): {
  mainUserId: string;
  semiAccounts: Array<{ username: string; password: string; phoneIndex: number }>;
} {
  return JSON.parse(jsonString);
}

// ============================================================================
// Phone Number Management
// ============================================================================

export interface PhoneNumberConfig {
  index: 1 | 2 | 3 | 4;
  number: string;          // E.164 format recommended: +1234567890
  label: string;           // User-defined label: "Personal", "Business", etc.
  isActive: boolean;
  linkedSemiAccountId: string | null;
}

/**
 * Validate phone number format
 * Basic validation - can be enhanced with libphonenumber
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove all non-numeric characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Check if it's a valid format (basic check)
  // E.164 format: +[country code][number] (max 15 digits)
  const e164Regex = /^\+?\d{10,15}$/;
  return e164Regex.test(cleaned);
}

/**
 * Format phone number to E.164
 */
export function formatPhoneNumberE164(phoneNumber: string, defaultCountryCode = '+1'): string {
  const cleaned = phoneNumber.replace(/\D/g, '');

  // If no country code, add default
  if (!phoneNumber.startsWith('+')) {
    return `${defaultCountryCode}${cleaned}`;
  }

  return `+${cleaned}`;
}

/**
 * Create default phone number configurations
 */
export function createDefaultPhoneConfigs(): Omit<PhoneNumberConfig, 'linkedSemiAccountId'>[] {
  return [
    { index: 1, number: '', label: 'Phone 1', isActive: false },
    { index: 2, number: '', label: 'Phone 2', isActive: false },
    { index: 3, number: '', label: 'Phone 3', isActive: false },
    { index: 4, number: '', label: 'Phone 4', isActive: false },
  ];
}

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Validate credential strength
 */
export function validateCredentialStrength(credential: string, minLength: number): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (credential.length < minLength) {
    errors.push(`Must be at least ${minLength} characters`);
  }

  if (!/[A-Z]/.test(credential)) {
    errors.push('Must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(credential)) {
    errors.push('Must contain at least one lowercase letter');
  }

  if (!/\d/.test(credential)) {
    errors.push('Must contain at least one number');
  }

  if (!/[!@#$%^&*()\-_=+[\]{}|;:,.<>?]/.test(credential)) {
    errors.push('Must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate display-safe version of credential (first 8 chars + ***)
 */
export function maskCredential(credential: string): string {
  if (credential.length <= 8) {
    return credential;
  }
  return `${credential.substring(0, 8)}${'*'.repeat(credential.length - 8)}`;
}


