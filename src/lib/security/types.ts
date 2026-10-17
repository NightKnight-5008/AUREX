/**
 * AUREX FINANCIAL OPERATING SYSTEM - SECURITY MODULE
 *
 * Type definitions for secure data storage and classification.
 *
 * DATA CLASSIFICATION:
 * - PUBLIC: UI preferences, non-sensitive config
 * - PRIVATE: User metadata (non-sensitive identifiers)
 * - SENSITIVE: Tokens, credentials, financial data
 *
 * STORAGE STRATEGY:
 * - PUBLIC: localStorage (plaintext)
 * - PRIVATE: localStorage (plaintext, but access-controlled)
 * - SENSITIVE: Encrypted storage with session management
 */

/**
 * Data classification levels
 */
export enum DataClassification {
  /** UI preferences, theme, language - safe for plaintext storage */
  PUBLIC = 'PUBLIC',

  /** User ID, email, non-sensitive metadata - access controlled */
  PRIVATE = 'PRIVATE',

  /** Auth tokens, credentials, financial data - encrypted */
  SENSITIVE = 'SENSITIVE',
}

/**
 * Storage backend types
 */
export enum StorageBackend {
  /** Browser localStorage (plaintext) */
  LOCAL_STORAGE = 'LOCAL_STORAGE',

  /** Encrypted in-memory storage (session-only) */
  ENCRYPTED_MEMORY = 'ENCRYPTED_MEMORY',

  /** IndexedDB with encryption (persistent) */
  ENCRYPTED_INDEXED_DB = 'ENCRYPTED_INDEXED_DB',

  /** HttpOnly cookie (server-managed) */
  HTTP_ONLY_COOKIE = 'HTTP_ONLY_COOKIE',
}

/**
 * Secure storage item metadata
 */
export interface SecureStorageItem<T = any> {
  /** Unique key */
  key: string;

  /** Stored value */
  value: T;

  /** Data classification */
  classification: DataClassification;

  /** Storage backend used */
  backend: StorageBackend;

  /** Expiration timestamp (optional) */
  expiresAt?: number;

  /** Creation timestamp */
  createdAt: number;

  /** Last accessed timestamp */
  lastAccessedAt: number;

  /** Encryption metadata (for SENSITIVE data) */
  encryption?: {
    algorithm: 'AES-256-GCM';
    iv: string;  // Initialization vector (hex)
    tag: string;  // Authentication tag (hex)
  };
}

/**
 * Storage options for set operations
 */
export interface StorageOptions {
  /** Data classification (determines storage backend) */
  classification: DataClassification;

  /** Time-to-live in milliseconds (optional) */
  ttl?: number;

  /** Custom expiration timestamp (optional) */
  expiresAt?: number;

  /** Force specific backend (advanced use) */
  forceBackend?: StorageBackend;
}

/**
 * Auth token metadata
 */
export interface AuthTokenMetadata {
  token: string;
  expiresAt: number;
  issuedAt: number;
  userId: string;
  sessionId: string;
}

/**
 * OAuth token metadata
 */
export interface OAuthTokenMetadata {
  service: 'google-calendar' | 'google-tasks' | 'google-docs';
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string[];
}

/**
 * Payroll credential metadata
 */
export interface PayrollCredential {
  pin: string;  // Hashed, not plaintext
  createdAt: number;
  lastUsedAt: number;
  failedAttempts: number;
  lockedUntil?: number;
}

/**
 * Session metadata for activity tracking
 */
export interface SessionMetadata {
  sessionId: string;
  startedAt: number;
  lastActivity: number;
  userAgent: string;
  tabId: string;
  active: boolean;
}
