import { createLogger } from '../../../shared/utils';

const logger = createLogger('cache-service');

interface CacheEntry {
  value: string;
  expiry: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize: number = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    // If cache is at max size, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
    
    logger.debug('Cache entry set', { key: key.substring(0, 50), ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  async getStats(): Promise<any> {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredCount++;
      }
      totalSize += key.length + entry.value.length;
    }
    
    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      maxSize: this.maxSize,
      approximateSizeBytes: totalSize,
      hitRate: this.calculateHitRate()
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug('Cache cleanup completed', { removedCount, remainingEntries: this.cache.size });
    }
  }

  private evictOldest(): void {
    // Simple LRU-like eviction - remove 10% of entries
    const entriesToRemove = Math.floor(this.maxSize * 0.1);
    let removed = 0;
    
    for (const key of this.cache.keys()) {
      if (removed >= entriesToRemove) {
        break;
      }
      this.cache.delete(key);
      removed++;
    }
    
    logger.debug('Cache eviction completed', { removedCount: removed });
  }

  private calculateHitRate(): number {
    // This is a simplified hit rate calculation
    // In a production system, you'd want to track hits/misses over time
    return 0.75; // Placeholder
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}