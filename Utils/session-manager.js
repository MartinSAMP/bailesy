export class SessionManager {
    constructor(options = {}) {
        this.sessions = new Map();
        this.maxSessions = options.maxSessions || 10;
        this.sessionTimeout = options.sessionTimeout || 3600000;
        this.onSessionExpired = options.onSessionExpired || (() => {});
        this.onSessionCreated = options.onSessionCreated || (() => {});
    }

    create(sessionId, data = {}) {
        if (this.sessions.size >= this.maxSessions) {
            const oldestSession = this.getOldest();
            if (oldestSession) {
                this.destroy(oldestSession.id);
            }
        }

        const session = {
            id: sessionId,
            data,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            expiresAt: Date.now() + this.sessionTimeout,
            isActive: true
        };

        this.sessions.set(sessionId, session);
        this.onSessionCreated(session);

        return session;
    }

    get(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            return null;
        }

        if (Date.now() > session.expiresAt) {
            this.destroy(sessionId);
            return null;
        }

        session.lastActivity = Date.now();
        return session;
    }

    update(sessionId, data) {
        const session = this.get(sessionId);
        if (session) {
            session.data = { ...session.data, ...data };
            session.lastActivity = Date.now();
            return session;
        }
        return null;
    }

    destroy(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.isActive = false;
            this.onSessionExpired(session);
            this.sessions.delete(sessionId);
            return true;
        }
        return false;
    }

    extend(sessionId, additionalMs) {
        const session = this.get(sessionId);
        if (session) {
            session.expiresAt += additionalMs;
            return session;
        }
        return null;
    }

    getAll() {
        return Array.from(this.sessions.values());
    }

    getActive() {
        return this.getAll().filter(s => s.isActive && Date.now() < s.expiresAt);
    }

    getOldest() {
        const sessions = this.getAll();
        if (sessions.length === 0) return null;
        
        return sessions.reduce((oldest, current) => 
            current.createdAt < oldest.createdAt ? current : oldest
        );
    }

    cleanup() {
        const now = Date.now();
        for (const [id, session] of this.sessions.entries()) {
            if (now > session.expiresAt) {
                this.destroy(id);
            }
        }
    }

    getStats() {
        const sessions = this.getAll();
        const active = this.getActive();
        
        return {
            total: sessions.length,
            active: active.length,
            expired: sessions.length - active.length,
            maxSessions: this.maxSessions,
            avgDuration: sessions.length > 0 
                ? sessions.reduce((sum, s) => sum + (s.lastActivity - s.createdAt), 0) / sessions.length 
                : 0
        };
    }
}
