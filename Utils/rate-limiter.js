export class RateLimiter {
    constructor(maxRequests = 10, windowMs = 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    async acquire(key = 'default') {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        
        const validRequests = userRequests.filter(time => now - time < this.windowMs);
        
        if (validRequests.length >= this.maxRequests) {
            const oldestRequest = validRequests[0];
            const waitTime = this.windowMs - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.acquire(key);
        }
        
        validRequests.push(now);
        this.requests.set(key, validRequests);
        
        return true;
    }

    reset(key) {
        if (key) {
            this.requests.delete(key);
        } else {
            this.requests.clear();
        }
    }

    getStats(key = 'default') {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        const validRequests = userRequests.filter(time => now - time < this.windowMs);
        
        return {
            current: validRequests.length,
            max: this.maxRequests,
            remaining: Math.max(0, this.maxRequests - validRequests.length),
            resetIn: validRequests.length > 0 ? this.windowMs - (now - validRequests[0]) : 0
        };
    }

    setLimits(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
}
