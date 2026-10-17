/**
 * LocalCache - Local Data Caching
 * 
 * Implements memory and persistent cache with TTL-based expiration
 * Validates: Requirements 13.6, 13.7
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds (default: 5 minutes)
  persistent?: boolean; // Whether to persist to storage (default: true)
}

/**
 * LocalCache class
 * Manages in-memory and persistent cache with TTL expiration
 */
export class LocalCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private storagePrefix = 'cache:';
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup of expired entries (every minute)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);

    console.log('[LocalCache] Initialized');
  }

  /**
   * Get data from cache
   * Validates: Requirement 13.6
   * 
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  public async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      console.log('[LocalCache] Memory cache hit', { key });
      return memoryEntry.data as T;
    }

    // Check persistent storage
    try {
      let storedData: string | null = null;

      if (window.electronAPI?.storage) {
        storedData = await window.electronAPI.storage.get(`${this.storagePrefix}${key}`);
      } else {
        storedData = localStorage.getItem(`${this.storagePrefix}${key}`);
      }

      if (storedData) {
        const entry: CacheEntry<T> = JSON.parse(storedData);
        
        if (!this.isExpired(entry)) {
          // Update memory cache
          this.memoryCache.set(key, entry);
          console.log('[LocalCache] Persistent cache hit', { key });
          return entry.data;
        } else {
          // Remove expired entry
          await this.remove(key);
        }
      }
    } catch (error) {
      console.error('[LocalCache] Error reading from cache:', error);
    }

    console.log('[LocalCache] Cache miss', { key });
    return null;
  }

  /**
   * Set data in cache
   * Validates: Requirement 13.6
   * 
   * @param key - Cache key
   * @param data - Data to cache
   * @param options - Cache options (TTL, persistent)
   */
  public async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl ?? this.defaultTTL;
    const persistent = options.persistent ?? true;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store in persistent storage if enabled
    if (persistent) {
      try {
        const serialized = JSON.stringify(entry);

        if (window.electronAPI?.storage) {
          await window.electronAPI.storage.set(
            `${this.storagePrefix}${key}`,
            serialized,
            'PRIVATE'
          );
        } else {
          localStorage.setItem(`${this.storagePrefix}${key}`, serialized);
        }

        console.log('[LocalCache] Data cached', { key, ttl, persistent });
      } catch (error) {
        console.error('[LocalCache] Error writing to cache:', error);
      }
    } else {
      console.log('[LocalCache] Data cached (memory only)', { key, ttl });
    }
  }

  /**
   * Remove data from cache
   * Validates: Requirement 13.7
   * 
   * @param key - Cache key
   */
  public async remove(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from persistent storage
    try {
      if (window.electronAPI?.storage) {
        await window.electronAPI.storage.remove(`${this.storagePrefix}${key}`);
      } else {
        localStorage.removeItem(`${this.storagePrefix}${key}`);
      }

      console.log('[LocalCache] Cache entry removed', { key });
    } catch (error) {
      console.error('[LocalCache] Error removing from cache:', error);
    }
  }

  /**
   * Clear all cache entries
   * Validates: Requirement 13.7
   */
  public async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear persistent storage
    try {
      if (window.electronAPI?.storage) {
        // Note: Electron storage doesn't have a clear method, so we'd need to track keys
        console.log('[LocalCache] Memory cache cleared (persistent storage requires manual cleanup)');
      } else {
        // Clear localStorage entries with our prefix
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.storagePrefix)) {
            localStorage.removeItem(key);
          }
        }
        console.log('[LocalCache] All cache cleared');
      }
    } catch (error) {
      console.error('[LocalCache] Error clearing cache:', error);
    }
  }

  /**
   * Check if a cache entry has expired
   * Validates: Requirement 13.7
   * 
   * @param entry - Cache entry to check
   * @returns True if expired, false otherwise
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Cleanup expired entries from memory cache
   * Validates: Requirement 13.7
   */
  private cleanup(): void {
    let expiredCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log('[LocalCache] Cleaned up expired entries', { count: expiredCount });
    }
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  public getStats(): { memorySize: number; keys: string[] } {
    return {
      memorySize: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    };
  }

  /**
   * Destroy the cache and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.memoryCache.clear();
    console.log('[LocalCache] Destroyed');
  }
}

// Export singleton instance
export const localCache = new LocalCache();
