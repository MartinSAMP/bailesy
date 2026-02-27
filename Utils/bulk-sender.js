import { MessageQueue } from './message-queue.js';
import { RateLimiter } from './rate-limiter.js';

export class BulkSender {
    constructor(sendFunction, options = {}) {
        this.sendFunction = sendFunction;
        this.rateLimiter = new RateLimiter(
            options.maxPerWindow || 20,
            options.windowMs || 60000
        );
        this.queue = new MessageQueue({
            concurrency: options.concurrency || 1,
            delayMs: options.delayMs || 1000,
            onError: options.onError,
            onSuccess: options.onSuccess
        });
        this.results = [];
        this.errors = [];
    }

    async send(recipients, message, options = {}) {
        this.results = [];
        this.errors = [];

        const tasks = recipients.map((recipient, index) => ({
            recipient,
            message,
            index,
            priority: options.priority || 0
        }));

        const promises = tasks.map(task => 
            this.queue.add(async () => {
                await this.rateLimiter.acquire(task.recipient);
                
                try {
                    const result = await this.sendFunction(task.recipient, task.message);
                    this.results.push({
                        recipient: task.recipient,
                        success: true,
                        result,
                        index: task.index
                    });
                    return result;
                } catch (error) {
                    this.errors.push({
                        recipient: task.recipient,
                        error,
                        index: task.index
                    });
                    throw error;
                }
            }, task.priority)
        );

        await Promise.allSettled(promises);

        return {
            total: recipients.length,
            successful: this.results.length,
            failed: this.errors.length,
            results: this.results,
            errors: this.errors
        };
    }

    async sendWithTemplate(recipients, templateFunction, options = {}) {
        return this.send(
            recipients,
            null,
            {
                ...options,
                customSend: async (recipient) => {
                    const message = await templateFunction(recipient);
                    return this.sendFunction(recipient, message);
                }
            }
        );
    }

    getProgress() {
        const queueStats = this.queue.getStats();
        return {
            completed: this.results.length + this.errors.length,
            successful: this.results.length,
            failed: this.errors.length,
            queued: queueStats.queued,
            active: queueStats.active
        };
    }

    pause() {
        this.queue.clear();
    }

    getResults() {
        return {
            results: this.results,
            errors: this.errors
        };
    }
}
