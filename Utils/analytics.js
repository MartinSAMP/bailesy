export class Analytics {
    constructor() {
        this.events = [];
        this.metrics = new Map();
        this.startTime = Date.now();
    }

    track(eventName, data = {}) {
        const event = {
            name: eventName,
            data,
            timestamp: Date.now(),
            id: this.generateId()
        };
        
        this.events.push(event);
        this.updateMetrics(eventName);
        
        return event;
    }

    updateMetrics(eventName) {
        const current = this.metrics.get(eventName) || { count: 0, lastOccurred: null };
        this.metrics.set(eventName, {
            count: current.count + 1,
            lastOccurred: Date.now()
        });
    }

    getEvents(filter = {}) {
        let filtered = this.events;

        if (filter.name) {
            filtered = filtered.filter(e => e.name === filter.name);
        }

        if (filter.since) {
            filtered = filtered.filter(e => e.timestamp >= filter.since);
        }

        if (filter.until) {
            filtered = filtered.filter(e => e.timestamp <= filter.until);
        }

        return filtered;
    }

    getMetrics() {
        return Object.fromEntries(this.metrics);
    }

    getTopEvents(limit = 10) {
        return Array.from(this.metrics.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([name, data]) => ({ name, ...data }));
    }

    getEventRate(eventName, windowMs = 60000) {
        const now = Date.now();
        const recentEvents = this.events.filter(e => 
            e.name === eventName && now - e.timestamp <= windowMs
        );
        
        return (recentEvents.length / windowMs) * 1000;
    }

    getSummary() {
        const now = Date.now();
        const uptime = now - this.startTime;
        
        return {
            totalEvents: this.events.length,
            uniqueEvents: this.metrics.size,
            uptime,
            eventsPerSecond: (this.events.length / uptime) * 1000,
            topEvents: this.getTopEvents(5)
        };
    }

    clear() {
        this.events = [];
        this.metrics.clear();
    }

    export() {
        return {
            events: this.events,
            metrics: Object.fromEntries(this.metrics),
            startTime: this.startTime,
            exportedAt: Date.now()
        };
    }

    import(data) {
        this.events = data.events || [];
        this.metrics = new Map(Object.entries(data.metrics || {}));
        this.startTime = data.startTime || Date.now();
    }

    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
