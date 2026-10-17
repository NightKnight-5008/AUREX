/**
 * AUREX FINANCIAL OPERATING SYSTEM - SECURE STORAGE MODULE
 *
 * Provides unified API for secure data storage with automatic encryption
 * based on data classification.
 *
 * SECURITY MODEL:
 * - PUBLIC data: localStorage (plaintext)
 * - PRIVATE data: localStorage (plaintext, access-controlled)
 * - SENSITIVE data: Encrypted storage with session-based keys
 *
 * STORAGE STRATEGY:
 * - Auth tokens: Encrypted session storage (ideally HttpOnly cookies in production)
 * - OAuth tokens: Encrypted localStorage with expiry
 * - Payroll credentials: Encrypted with additional protections
 * - UI preferences: Plaintext localStorage
 *
 * MIGRATION PATH:
 * This module provides a migration path from direct localStorage usage to
 * a secure storage abstraction. The encryption is conceptual for client-side
 * defense-in-depth. In production, sensitive data should use HttpOnly cookies
 * with server-side session management.
 */

import { EncryptionService } from './EncryptionService';
import {
  DataClassification,
  StorageBackend,
  type SecureStorageItem,
  type StorageOptions,
  type AuthTokenMetadata,
  type OAuthTokenMetadata,
  type PayrollCredential,
  type SessionMetadata,
} from './types';

/**
 * Secure storage abstraction with automatic encryption
 */
export class SecureStorage {
  private static readonly STORAGE_PREFIX = '__aurex_secure__';
  private static initialized = false;

  /**
   * Initialize secure storage (call once on app startup)
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize encryption service
    await EncryptionService.initialize();

    // Clean up expired items
    await this.cleanupExpired();

    this.initialized = true;
  }

  /**
   * Store data with automatic encryption based on classification
   */
  static async set<T>(
    key: string,
    value: T,
    options: StorageOptions
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const now = Date.now();
    const expiresAt = options.expiresAt || (options.ttl ? now + options.ttl : undefined);

    const item: SecureStorageItem<T> = {
      key,
      value,
      classification: options.classification,
      backend: options.forceBackend || this.getDefaultBackend(options.classification),
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
    };

    // Encrypt SENSITIVE data
    if (options.classification === DataClassification.SENSITIVE) {
      const serialized = JSON.stringify(value);
      const encrypted = await EncryptionService.encrypt(serialized);

      item.encryption = {
        algorithm: 'AES-256-GCM',
        iv: encrypted.iv,
        tag: encrypted.tag,
      };

      // Store encrypted ciphertext instead of value
      const encryptedItem = {
        ...item,
        value: encrypted.ciphertext,
      };

      this.writeToBackend(key, encryptedItem, item.backend);
    } else {
      // Store plaintext for PUBLIC and PRIVATE
      this.writeToBackend(key, item, item.backend);
    }
  }

  /**
   * Retrieve data with automatic decryption
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const item = this.readFromBackend<T>(key);

    if (!item) {
      return null;
    }

    // Check expiration
    if (item.expiresAt && item.expiresAt < Date.now()) {
      await this.remove(key);
      return null;
    }

    // Update last accessed time (for SENSITIVE data only)
    if (item.classification === DataClassification.SENSITIVE) {
      item.lastAccessedAt = Date.now();
      this.writeToBackend(key, item, item.backend);
    }

    // Decrypt SENSITIVE data
    if (item.classification === DataClassification.SENSITIVE && item.encryption) {
      try {
        const decrypted = await EncryptionService.decrypt(
          item.value as string,
          item.encryption.iv,
          item.encryption.tag
        );
        return JSON.parse(decrypted) as T;
      } catch (error) {
        console.warn('Decryption failed (session key expired/invalidated). Clearing stored key.', key);
        // Remove corrupted data
        await this.remove(key);
        return null;
      }
    }

    return item.value;
  }

  /**
   * Remove item from storage
   */
  static async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);

    // Try removing from all backends
    localStorage.removeItem(fullKey);
    sessionStorage.removeItem(fullKey);
  }

  /**
   * Clear all storage (optionally filtered by classification)
   */
  static async clear(classification?: DataClassification): Promise<void> {
    const keys = this.getAllKeys();

    for (const key of keys) {
      if (classification) {
        const item = this.readFromBackend(key);
        if (item && item.classification === classification) {
          await this.remove(key);
        }
      } else {
        await this.remove(key);
      }
    }
  }

  /**
   * Clean up expired items
   */
  private static async cleanupExpired(): Promise<void> {
    const keys = this.getAllKeys();
    const now = Date.now();

    for (const key of keys) {
      const item = this.readFromBackend(key);
      if (item && item.expiresAt && item.expiresAt < now) {
        await this.remove(key);
      }
    }
  }

  /**
   * Get default backend for classification level
   */
  private static getDefaultBackend(classification: DataClassification): StorageBackend {
    switch (classification) {
      case DataClassification.PUBLIC:
        return StorageBackend.LOCAL_STORAGE;
      case DataClassification.PRIVATE:
        return StorageBackend.LOCAL_STORAGE;
      case DataClassification.SENSITIVE:
        // Use localStorage with encryption for now
        // In production, this should be HTTP_ONLY_COOKIE
        return StorageBackend.LOCAL_STORAGE;
      default:
        return StorageBackend.LOCAL_STORAGE;
    }
  }

  /**
   * Write item to storage backend
   */
  private static writeToBackend<T>(
    key: string,
    item: SecureStorageItem<T>,
    backend: StorageBackend
  ): void {
    const fullKey = this.getFullKey(key);
    const serialized = JSON.stringify(item);

    switch (backend) {
      case StorageBackend.LOCAL_STORAGE:
      case StorageBackend.ENCRYPTED_INDEXED_DB:
        localStorage.setItem(fullKey, serialized);
        break;
      case StorageBackend.ENCRYPTED_MEMORY:
        sessionStorage.setItem(fullKey, serialized);
        break;
      case StorageBackend.HTTP_ONLY_COOKIE:
        // Cannot be set from JavaScript (server-only)
        console.warn('HTTP_ONLY_COOKIE backend not supported from client-side');
        localStorage.setItem(fullKey, serialized);
        break;
    }
  }

  /**
   * Read item from storage backend
   */
  private static readFromBackend<T>(key: string): SecureStorageItem<T> | null {
    const fullKey = this.getFullKey(key);

    // Try localStorage first
    let serialized = localStorage.getItem(fullKey);

    // Fallback to sessionStorage
    if (!serialized) {
      serialized = sessionStorage.getItem(fullKey);
    }

    if (!serialized) {
      return null;
    }

    try {
      return JSON.parse(serialized) as SecureStorageItem<T>;
    } catch (error) {
      console.error('Failed to parse storage item:', error);
      return null;
    }
  }

  /**
   * Get all storage keys
   */
  private static getAllKeys(): string[] {
    const keys: string[] = [];

    // Get from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        keys.push(key.slice(this.STORAGE_PREFIX.length + 1));
      }
    }

    // Get from sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        const shortKey = key.slice(this.STORAGE_PREFIX.length + 1);
        if (!keys.includes(shortKey)) {
          keys.push(shortKey);
        }
      }
    }

    return keys;
  }

  /**
   * Get full storage key with prefix
   */
  private static getFullKey(key: string): string {
    return `${this.STORAGE_PREFIX}:${key}`;
  }

  // ========================================================================
  // SPECIALIZED METHODS FOR COMMON USE CASES
  // ========================================================================

  /**
   * Store authentication token
   */
  static async setAuthToken(metadata: AuthTokenMetadata): Promise<void> {
    await this.set('auth_token', metadata, {
      classification: DataClassification.SENSITIVE,
      expiresAt: metadata.expiresAt,
    });
  }

  /**
   * Retrieve authentication token
   */
  static async getAuthToken(): Promise<AuthTokenMetadata | null> {
    return this.get<AuthTokenMetadata>('auth_token');
  }

  /**
   * Remove authentication token
   */
  static async clearAuthToken(): Promise<void> {
    await this.remove('auth_token');
  }

  /**
   * Store OAuth token
   */
  static async setOAuthToken(
    service: string,
    metadata: OAuthTokenMetadata
  ): Promise<void> {
    await this.set(`oauth_token_${service}`, metadata, {
      classification: DataClassification.SENSITIVE,
      expiresAt: metadata.expiresAt,
    });
  }

  /**
   * Retrieve OAuth token
   */
  static async getOAuthToken(service: string): Promise<OAuthTokenMetadata | null> {
    return this.get<OAuthTokenMetadata>(`oauth_token_${service}`);
  }

  /**
   * Remove OAuth token
   */
  static async clearOAuthToken(service: string): Promise<void> {
    await this.remove(`oauth_token_${service}`);
  }

  /**
   * Store payroll credential
   */
  static async setPayrollCredential(credential: PayrollCredential): Promise<void> {
    await this.set('payroll_credential', credential, {
      classification: DataClassification.SENSITIVE,
    });
  }

  /**
   * Retrieve payroll credential
   */
  static async getPayrollCredential(): Promise<PayrollCredential | null> {
    return this.get<PayrollCredential>('payroll_credential');
  }

  /**
   * Remove payroll credential
   */
  static async clearPayrollCredential(): Promise<void> {
    await this.remove('payroll_credential');
  }

  /**
   * Store session metadata
   */
  static async setSessionMetadata(metadata: SessionMetadata): Promise<void> {
    await this.set('session_metadata', metadata, {
      classification: DataClassification.PRIVATE,
    });
  }

  /**
   * Retrieve session metadata
   */
  static async getSessionMetadata(): Promise<SessionMetadata | null> {
    return this.get<SessionMetadata>('session_metadata');
  }

  /**
   * Store UI preference (PUBLIC data)
   */
  static async setPreference<T>(key: string, value: T): Promise<void> {
    await this.set(`pref_${key}`, value, {
      classification: DataClassification.PUBLIC,
    });
  }

  /**
   * Retrieve UI preference
   */
  static async getPreference<T>(key: string): Promise<T | null> {
    return this.get<T>(`pref_${key}`);
  }

  /**
   * Clear all sensitive data (on logout)
   */
  static async clearSensitiveData(): Promise<void> {
    await this.clear(DataClassification.SENSITIVE);
    EncryptionService.clearKeys();
  }

  /**
   * Clear all data (full reset)
   */
  static async clearAllData(): Promise<void> {
    await this.clear();
    EncryptionService.clearKeys();
  }
}
