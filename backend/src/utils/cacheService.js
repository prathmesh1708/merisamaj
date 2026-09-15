/**
 * cacheService.js
 * In-memory high performance TTL micro-cache for fast read-heavy endpoints.
 * Serves cached responses in < 5ms without hitting MongoDB.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Retrieve cached item if valid
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Set cache item with TTL
   * @param {string} key
   * @param {any} data
   * @param {number} ttlSeconds (default 60s)
   */
  set(key, data, ttlSeconds = 60) {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Delete specific key
   * @param {string} key
   */
  del(key) {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regex
   * @param {string|RegExp} pattern
   */
  invalidate(pattern) {
    const isRegex = pattern instanceof RegExp;
    for (const key of this.store.keys()) {
      if (isRegex ? pattern.test(key) : key.startsWith(pattern)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  flush() {
    this.store.clear();
  }
}

const cacheService = new MemoryCache();

module.exports = cacheService;
