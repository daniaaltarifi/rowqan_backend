// cacheService.js
class CacheService {
    constructor() {
      this.cache = new Map();
      this.ttl = new Map();
    }
  
    set(key, value, ttlSeconds = 600) {
      this.cache.set(key, value);
      this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
      
      // تنظيف تلقائي بعد انتهاء TTL
      setTimeout(() => {
        if (this.cache.has(key)) {
          this.cache.delete(key);
          this.ttl.delete(key);
        }
      }, ttlSeconds * 1000);
    }
  
    get(key) {
      if (!this.cache.has(key)) return null;
      
      const expiry = this.ttl.get(key);
      if (expiry < Date.now()) {
        this.cache.delete(key);
        this.ttl.delete(key);
        return null;
      }
      
      return this.cache.get(key);
    }
  
    clear() {
      this.cache.clear();
      this.ttl.clear();
    }
  }
  
  module.exports = new CacheService();