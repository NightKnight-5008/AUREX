/**
 * End-to-End Encryption Utilities
 *
 * Provides RSA-2048 public/private key cryptography for secure data encryption
 * across Android app, desktop app, and database storage.
 *
 * Features:
 * - RSA-2048 keypair generation per user
 * - AES-256-GCM for symmetric encryption of large data
 * - Hybrid encryption: RSA for key exchange, AES for data
 * - Device-specific encryption keys
 * - Key rotation support
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface KeyPair {
  publicKey: string;      // PEM format public key
  privateKey: string;     // PEM format private key (encrypted at rest)
  keyId: string;          // Unique identifier for this keypair
  createdAt: string;      // ISO timestamp
  algorithm: 'RSA-2048';  // Key algorithm
}

export interface EncryptedData {
  data: string;           // Base64 encoded encrypted data
  iv: string;             // Initialization vector (for AES)
  algorithm: string;      // Encryption algorithm used
  keyId?: string;         // Optional: which key was used
  timestamp: string;      // When encrypted
}

export interface DeviceKey {
  deviceId: string;       // Unique device identifier
  encryptedKey: string;   // Device-specific encryption key (encrypted with user's public key)
  publicKey: string;      // Device's public key
  createdAt: string;      // ISO timestamp
  lastUsed: string;       // Last usage timestamp
}

// ============================================================================
// RSA Key Generation (Browser-Compatible)
// ============================================================================

/**
 * Generate RSA-2048 keypair using Web Crypto API
 * Returns both public and private keys in PEM format
 */
export async function generateRSAKeyPair(): Promise<KeyPair> {
  try {
    // Generate RSA-2048 keypair using Web Crypto API
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537
        hash: 'SHA-256',
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export public key to PEM format
    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);
    const publicKeyPEM = formatPEM(publicKeyBase64, 'PUBLIC KEY');

    // Export private key to PEM format
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);
    const privateKeyPEM = formatPEM(privateKeyBase64, 'PRIVATE KEY');

    return {
      publicKey: publicKeyPEM,
      privateKey: privateKeyPEM,
      keyId: generateKeyId(),
      createdAt: new Date().toISOString(),
      algorithm: 'RSA-2048',
    };
  } catch (error) {
    console.error('Failed to generate RSA keypair:', error);
    throw new Error('RSA key generation failed');
  }
}

/**
 * Import RSA public key from PEM format
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pemKey, 'PUBLIC KEY');
  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

/**
 * Import RSA private key from PEM format
 */
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pemKey, 'PRIVATE KEY');
  return await window.crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
}

// ============================================================================
// AES-256-GCM Symmetric Encryption
// ============================================================================

/**
 * Generate AES-256-GCM key for symmetric encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 * Returns encrypted data with IV
 */
export async function encryptWithAES(
  data: string,
  key: CryptoKey
): Promise<EncryptedData> {
  try {
    // Generate random IV (12 bytes for GCM)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Encrypt
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    return {
      data: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv.buffer),
      algorithm: 'AES-256-GCM',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('AES encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptWithAES(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  try {
    // Convert base64 to ArrayBuffer
    const dataBuffer = base64ToArrayBuffer(encryptedData.data);
    const iv = base64ToArrayBuffer(encryptedData.iv);

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    // Convert ArrayBuffer to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('AES decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// ============================================================================
// Hybrid Encryption (RSA + AES)
// ============================================================================

/**
 * Encrypt data using hybrid encryption
 * 1. Generate random AES key
 * 2. Encrypt data with AES key
 * 3. Encrypt AES key with RSA public key
 *
 * This allows encryption of large data while maintaining RSA security
 */
export async function hybridEncrypt(
  data: string,
  publicKeyPEM: string
): Promise<{ encryptedData: EncryptedData; encryptedKey: string }> {
  try {
    // Generate random AES key
    const aesKey = await generateAESKey();

    // Encrypt data with AES
    const encryptedData = await encryptWithAES(data, aesKey);

    // Export AES key
    const aesKeyBuffer = await window.crypto.subtle.exportKey('raw', aesKey);

    // Import RSA public key
    const rsaPublicKey = await importPublicKey(publicKeyPEM);

    // Encrypt AES key with RSA public key
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      rsaPublicKey,
      aesKeyBuffer as ArrayBuffer
    );

    return {
      encryptedData,
      encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
    };
  } catch (error) {
    console.error('Hybrid encryption failed:', error);
    throw new Error('Failed to encrypt data with hybrid encryption');
  }
}

/**
 * Decrypt data using hybrid decryption
 * 1. Decrypt AES key with RSA private key
 * 2. Decrypt data with AES key
 */
export async function hybridDecrypt(
  encryptedData: EncryptedData,
  encryptedKey: string,
  privateKeyPEM: string
): Promise<string> {
  try {
    // Import RSA private key
    const rsaPrivateKey = await importPrivateKey(privateKeyPEM);

    // Decrypt AES key with RSA private key
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKey);
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP',
      },
      rsaPrivateKey,
      encryptedKeyBuffer
    );

    // Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyBuffer,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    // Decrypt data with AES key
    return await decryptWithAES(encryptedData, aesKey);
  } catch (error) {
    console.error('Hybrid decryption failed:', error);
    throw new Error('Failed to decrypt data with hybrid decryption');
  }
}

// ============================================================================
// SMS-Specific Encryption
// ============================================================================

/**
 * Encrypt SMS message content for storage
 * Uses user's public key for encryption
 */
export async function encryptSMSContent(
  messageContent: string,
  userPublicKey: string
): Promise<{ encryptedData: EncryptedData; encryptedKey: string }> {
  return await hybridEncrypt(messageContent, userPublicKey);
}

/**
 * Decrypt SMS message content for display
 * Uses user's private key for decryption
 */
export async function decryptSMSContent(
  encryptedData: EncryptedData,
  encryptedKey: string,
  userPrivateKey: string
): Promise<string> {
  return await hybridDecrypt(encryptedData, encryptedKey, userPrivateKey);
}

// ============================================================================
// Credential Encryption
// ============================================================================

/**
 * Encrypt semi-account credentials for storage
 */
export async function encryptCredentials(
  credentials: { username: string; password: string },
  userPublicKey: string
): Promise<{ encryptedData: EncryptedData; encryptedKey: string }> {
  const credentialsJSON = JSON.stringify(credentials);
  return await hybridEncrypt(credentialsJSON, userPublicKey);
}

/**
 * Decrypt semi-account credentials
 */
export async function decryptCredentials(
  encryptedData: EncryptedData,
  encryptedKey: string,
  userPrivateKey: string
): Promise<{ username: string; password: string }> {
  const credentialsJSON = await hybridDecrypt(encryptedData, encryptedKey, userPrivateKey);
  return JSON.parse(credentialsJSON);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Format key as PEM
 */
function formatPEM(base64Key: string, type: string): string {
  const chunks = base64Key.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${chunks.join('\n')}\n-----END ${type}-----`;
}

/**
 * Parse PEM key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string, type: string): ArrayBuffer {
  const base64 = pem
    .replace(`-----BEGIN ${type}-----`, '')
    .replace(`-----END ${type}-----`, '')
    .replace(/\s/g, '');
  return base64ToArrayBuffer(base64);
}

/**
 * Generate unique key ID
 */
function generateKeyId(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Key Storage Helpers
// ============================================================================

/**
 * Securely store private key (encrypted with user password)
 * WARNING: This is a simplified version. In production, use proper key derivation (PBKDF2)
 */
export async function encryptPrivateKeyForStorage(
  privateKeyPEM: string,
  userPassword: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> {
  try {
    // Generate salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16));

    // Derive key from password using PBKDF2
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(userPassword);

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer,
        iterations: 100000,
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt private key
    const privateKeyBuffer = encoder.encode(privateKeyPEM);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      derivedKey,
      privateKeyBuffer
    );

    return {
      encryptedKey: arrayBufferToBase64(encryptedBuffer),
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
    };
  } catch (error) {
    console.error('Failed to encrypt private key for storage:', error);
    throw new Error('Private key encryption failed');
  }
}

/**
 * Decrypt private key from storage
 */
export async function decryptPrivateKeyFromStorage(
  encryptedKey: string,
  salt: string,
  iv: string,
  userPassword: string
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(userPassword);

    // Import password
    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key from password
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: base64ToArrayBuffer(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt private key
    const encryptedBuffer = base64ToArrayBuffer(encryptedKey);
    const ivBuffer = base64ToArrayBuffer(iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      derivedKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Failed to decrypt private key from storage:', error);
    throw new Error('Private key decryption failed');
  }
}
