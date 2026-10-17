/**
 * AUREX FINANCIAL OPERATING SYSTEM - ENCRYPTION SERVICE
 *
 * Provides AES-256-GCM encryption for sensitive data storage.
 *
 * SECURITY MODEL:
 * - Encryption key derived from session + device fingerprint
 * - Unique IV per encryption operation
 * - Authentication tag for integrity verification
 * - Key rotation on session renewal
 *
 * NOTE: This is a CONCEPTUAL implementation for client-side encryption.
 * In production, sensitive data should use HttpOnly cookies with server-side
 * session management. This provides defense-in-depth for client-side storage.
 *
 * IMPORTANT: Browser-based encryption has inherent limitations:
 * - Keys must exist in JavaScript memory
 * - XSS can compromise the encryption
 * - This is NOT a substitute for server-side security
 * - Use primarily for defense-in-depth
 */

/**
 * Generate cryptographic key material from session data
 */
async function deriveEncryptionKey(passphrase: string, saltArray: Uint8Array): Promise<CryptoKey> {
  // Import passphrase as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using PBKDF2
  // TypeScript workaround for BufferSource type compatibility
  const params: Pbkdf2Params = {
    name: 'PBKDF2',
    salt: saltArray as unknown as BufferSource,
    iterations: 100000,  // OWASP recommendation
    hash: 'SHA-256',
  };

  return crypto.subtle.deriveKey(
    params,
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,  // Non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate unique device/session fingerprint
 */
function generateSessionFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset().toString(),
    screen.colorDepth.toString(),
    screen.width.toString() + 'x' + screen.height.toString(),
  ];

  // Create deterministic fingerprint
  return btoa(components.join('|'));
}

/**
 * Get or create master passphrase for session
 */
function getMasterPassphrase(): string {
  const PASSPHRASE_KEY = '__aurex_session_master__';

  // Check if passphrase exists in session storage
  let passphrase = sessionStorage.getItem(PASSPHRASE_KEY);

  if (!passphrase) {
    // Generate new random passphrase for this session
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    passphrase = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    // Store in sessionStorage (cleared when tab closes)
    sessionStorage.setItem(PASSPHRASE_KEY, passphrase);
  }

  // Combine with device fingerprint for additional entropy
  return passphrase + generateSessionFingerprint();
}

/**
 * Encryption service for sensitive data
 */
export class EncryptionService {
  private static salt: Uint8Array | null = null;

  /**
   * Initialize encryption service (call once on app startup)
   */
  static async initialize(): Promise<void> {
    // Generate or retrieve salt
    const SALT_KEY = '__aurex_crypto_salt__';
    const storedSalt = localStorage.getItem(SALT_KEY);

    if (storedSalt) {
      this.salt = new Uint8Array(storedSalt.split(',').map(Number));
    } else {
      // Generate new salt
      this.salt = new Uint8Array(16);
      crypto.getRandomValues(this.salt);

      // Store salt (salt is not secret, but should be consistent)
      localStorage.setItem(SALT_KEY, this.salt.toString());
    }
  }

  /**
   * Encrypt plaintext data
   */
  static async encrypt(plaintext: string): Promise<{
    ciphertext: string;
    iv: string;
    tag: string;
  }> {
    if (!this.salt) {
      await this.initialize();
    }

    // Derive encryption key from session passphrase
    const key = await deriveEncryptionKey(getMasterPassphrase(), this.salt!);

    // Generate random IV (must be unique per encryption)
    const iv = new Uint8Array(12);  // GCM standard IV length
    crypto.getRandomValues(iv);

    // Encrypt data
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,  // 128-bit authentication tag
      },
      key,
      encoder.encode(plaintext)
    );

    // Extract ciphertext and authentication tag
    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, -16);  // All but last 16 bytes
    const tag = encryptedArray.slice(-16);  // Last 16 bytes

    return {
      ciphertext: Array.from(ciphertext, byte => byte.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv, byte => byte.toString(16).padStart(2, '0')).join(''),
      tag: Array.from(tag, byte => byte.toString(16).padStart(2, '0')).join(''),
    };
  }

  /**
   * Decrypt ciphertext data
   */
  static async decrypt(
    ciphertext: string,
    iv: string,
    tag: string
  ): Promise<string> {
    if (!this.salt) {
      await this.initialize();
    }

    // Derive decryption key (same as encryption key)
    const key = await deriveEncryptionKey(getMasterPassphrase(), this.salt!);

    // Convert hex strings to Uint8Array
    const ciphertextArray = new Uint8Array(
      ciphertext.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    const ivArray = new Uint8Array(
      iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    const tagArray = new Uint8Array(
      tag.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    // Combine ciphertext and tag for decryption
    const encrypted = new Uint8Array(ciphertextArray.length + tagArray.length);
    encrypted.set(ciphertextArray);
    encrypted.set(tagArray, ciphertextArray.length);

    // Decrypt data
    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivArray,
          tagLength: 128,
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      // Decryption failed (wrong key, tampered data, or corrupted ciphertext)
      throw new Error('DECRYPTION_FAILED: Data integrity check failed');
    }
  }

  /**
   * Hash data for integrity verification (SHA-256)
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate cryptographically secure random ID
   */
  static generateId(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clear all encryption keys (on logout)
   */
  static clearKeys(): void {
    sessionStorage.removeItem('__aurex_session_master__');
    // Note: Salt persists across sessions (by design)
  }
}

/**
 * Hash a PIN for secure storage
 * Uses PBKDF2 with 100,000 iterations
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);

  // Get salt
  const SALT_KEY = '__aurex_pin_salt__';
  let saltStr = localStorage.getItem(SALT_KEY);

  if (!saltStr) {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    saltStr = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SALT_KEY, saltStr);
  }

  const salt = new Uint8Array(
    saltStr.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  // Import key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive hash using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256  // 256 bits = 32 bytes
  );

  const hashArray = new Uint8Array(derivedBits);
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify PIN against stored hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computedHash = await hashPin(pin);
  return computedHash === hash;
}
