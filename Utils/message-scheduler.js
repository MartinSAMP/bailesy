export class MessageScheduler {
    constructor() {
        this.scheduledMessages = new Map();
        this.timers = new Map();
    }

    schedule(messageId, sendFunction, delayMs) {
        if (this.scheduledMessages.has(messageId)) {
            this.cancel(messageId);
        }

        const scheduledTime = Date.now() + delayMs;
        this.scheduledMessages.set(messageId, {
            sendFunction,
            scheduledTime,
            delayMs
        });

        const timer = setTimeout(async () => {
            try {
                await sendFunction();
                this.scheduledMessages.delete(messageId);
                this.timers.delete(messageId);
            } catch (error) {
                console.error(`Failed to send scheduled message ${messageId}:`, error);
            }
        }, delayMs);

        this.timers.set(messageId, timer);
        return messageId;
    }

    cancel(messageId) {
        const timer = this.timers.get(messageId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(messageId);
            this.scheduledMessages.delete(messageId);
            return true;
        }
        return false;
    }

    cancelAll() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.scheduledMessages.clear();
    }

    getScheduled() {
        return Array.from(this.scheduledMessages.entries()).map(([id, data]) => ({
            id,
            scheduledTime: data.scheduledTime,
            remainingMs: Math.max(0, data.scheduledTime - Date.now())
        }));
    }

    reschedule(messageId, newDelayMs) {
        const scheduled = this.scheduledMessages.get(messageId);
        if (scheduled) {
            this.cancel(messageId);
            return this.schedule(messageId, scheduled.sendFunction, newDelayMs);
        }
        return null;
    }
}
