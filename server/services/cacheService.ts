import { config } from '../config/env';

/**
 * Cache entry with expiration timestamp
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface PostKeyParams {
  sort?: string;
  timeRange?: string;
  limit?: number;
  after?: string;
  before?: string;
}

/**
 * Cache Service Abstraction interface.
 * Returns Promises so that Redis or another distributed cache
 * can be plugged in as a drop-in replacement without altering caller code.
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  generatePostsKey(subreddit: string, params?: PostKeyParams): string;
  generateSubredditKey(subreddit: string): string;
}

/**
 * High-performance, lightweight in-memory cache implementation
 * with TTL expiration and automatic background sweeps.
 */
export class InMemoryCacheService implements ICacheService {
  private store = new Map<string, CacheEntry<any>>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup of expired keys
    this.cleanupTimer = setInterval(() => {
      this.purgeExpired();
    }, config.cache.cleanupIntervalMs);

    // Prevent cleanup timer from keeping process alive if server shuts down
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Generates deterministic cache key for subreddit post queries
   * Components: subreddit, sort, timeframe, limit, pagination (after/before)
   */
  generatePostsKey(subreddit: string, params: PostKeyParams = {}): string {
    const sub = subreddit.trim().toLowerCase().replace(/^r\//i, '');
    const sort = (params.sort || 'hot').toLowerCase();
    const timeframe = (params.timeRange || 'none').toLowerCase();
    const limit = params.limit || 25;
    const after = params.after ? params.after.trim() : 'none';
    const before = params.before ? params.before.trim() : 'none';

    return `reddit:posts:${sub}:sort=${sort}:time=${timeframe}:limit=${limit}:after=${after}:before=${before}`;
  }

  /**
   * Generates deterministic cache key for subreddit community metadata
   */
  generateSubredditKey(subreddit: string): string {
    const sub = subreddit.trim().toLowerCase().replace(/^r\//i, '');
    return `reddit:sub:${sub}`;
  }

  /**
   * Retrieves item from cache with TTL validation
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      console.log(`[CACHE MISS] ${key}`);
      return null;
    }

    const now = Date.now();
    if (now >= entry.expiresAt) {
      // Entry has expired
      this.store.delete(key);
      console.log(`[CACHE MISS] ${key} (expired)`);
      return null;
    }

    const remainingSecs = Math.max(0, Math.round((entry.expiresAt - now) / 1000));
    console.log(`[CACHE HIT] ${key} [ttl=${remainingSecs}s]`);
    return entry.value as T;
  }

  /**
   * Stores value in cache with expiration
   */
  async set<T>(key: string, value: T, ttlSeconds: number = config.cache.postsTtlSeconds): Promise<void> {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: now,
    });
  }

  /**
   * Check existence of valid unexpired key
   */
  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Removes specific key from cache
   */
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /**
   * Clears entire cache store
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Sweeps expired entries to maintain minimal memory footprint
   */
  private purgeExpired(): void {
    const now = Date.now();
    let purgedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[CACHE SWEEP] Purged ${purgedCount} expired items from memory cache`);
    }
  }

  /**
   * Destroy timer on shutdown
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance conforming to ICacheService abstraction
export const cacheService: ICacheService = new InMemoryCacheService();
