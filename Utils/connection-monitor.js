export class ConnectionMonitor {
    constructor(options = {}) {
        this.pingInterval = options.pingInterval || 30000;
        this.maxFailures = options.maxFailures || 3;
        this.failures = 0;
        this.isConnected = false;
        this.lastPing = null;
        this.lastPong = null;
        this.pingTimer = null;
        this.listeners = new Map();
        this.stats = {
            totalPings: 0,
            totalPongs: 0,
            totalFailures: 0,
            avgLatency: 0,
            latencies: []
        };
    }

    start(pingFunction) {
        this.pingFunction = pingFunction;
        this.isConnected = true;
        this.failures = 0;
        
        this.pingTimer = setInterval(async () => {
            await this.ping();
        }, this.pingInterval);
    }

    stop() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        this.isConnected = false;
    }

    async ping() {
        if (!this.pingFunction) return;

        this.lastPing = Date.now();
        this.stats.totalPings++;

        try {
            await this.pingFunction();
            this.lastPong = Date.now();
            this.stats.totalPongs++;
            
            const latency = this.lastPong - this.lastPing;
            this.stats.latencies.push(latency);
            
            if (this.stats.latencies.length > 100) {
                this.stats.latencies.shift();
            }
            
            this.stats.avgLatency = this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length;
            
            this.failures = 0;
            this.emit('pong', { latency });
        } catch (error) {
            this.failures++;
            this.stats.totalFailures++;
            this.emit('ping-failed', { failures: this.failures, error });

            if (this.failures >= this.maxFailures) {
                this.isConnected = false;
                this.emit('connection-lost', { failures: this.failures });
                this.stop();
            }
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            failures: this.failures,
            lastPing: this.lastPing,
            lastPong: this.lastPong,
            uptime: this.lastPing ? Date.now() - this.lastPing : 0
        };
    }

    reset() {
        this.failures = 0;
        this.stats = {
            totalPings: 0,
            totalPongs: 0,
            totalFailures: 0,
            avgLatency: 0,
            latencies: []
        };
    }
}
