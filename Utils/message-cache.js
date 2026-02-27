export class MessageCache {
    constructor(maxSize = 1000, ttlMs = 3600000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.hits = 0;
        this.misses = 0;
    }

    set(key, value, customTtl) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: customTtl || this.ttlMs,
            accessCount: 0
        });
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.misses++;
            return null;
        }

        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        item.accessCount++;
        this.hits++;
        return item.value;
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
            }
        }
    }

    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%',
            memoryUsage: this.estimateSize()
        };
    }

    estimateSize() {
        let size = 0;
        for (const [key, item] of this.cache.entries()) {
            size += key.length * 2;
            size += JSON.stringify(item.value).length * 2;
        }
        return (size / 1024).toFixed(2) + ' KB';
    }

    getMostAccessed(limit = 10) {
        return Array.from(this.cache.entries())
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, limit)
            .map(([key, item]) => ({
                key,
                accessCount: item.accessCount,
                age: Date.now() - item.timestamp
            }));
    }
}
