export class MessageQueue {
    constructor(options = {}) {
        this.queue = [];
        this.processing = false;
        this.concurrency = options.concurrency || 1;
        this.activeCount = 0;
        this.delayMs = options.delayMs || 0;
        this.onError = options.onError || ((err) => console.error(err));
        this.onSuccess = options.onSuccess || (() => {});
    }

    add(task, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                priority,
                resolve,
                reject,
                addedAt: Date.now()
            });
            
            this.queue.sort((a, b) => b.priority - a.priority);
            
            this.process();
        });
    }

    async process() {
        if (this.processing || this.activeCount >= this.concurrency) {
            return;
        }

        const item = this.queue.shift();
        if (!item) {
            return;
        }

        this.processing = true;
        this.activeCount++;

        try {
            if (this.delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }

            const result = await item.task();
            item.resolve(result);
            this.onSuccess(result);
        } catch (error) {
            item.reject(error);
            this.onError(error);
        } finally {
            this.activeCount--;
            this.processing = false;
            
            if (this.queue.length > 0) {
                setImmediate(() => this.process());
            }
        }
    }

    clear() {
        this.queue = [];
    }

    size() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    setPriority(index, priority) {
        if (this.queue[index]) {
            this.queue[index].priority = priority;
            this.queue.sort((a, b) => b.priority - a.priority);
        }
    }

    getStats() {
        return {
            queued: this.queue.length,
            active: this.activeCount,
            concurrency: this.concurrency,
            processing: this.processing
        };
    }
}
