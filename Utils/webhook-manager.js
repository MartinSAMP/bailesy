export class WebhookManager {
    constructor(options = {}) {
        this.webhooks = new Map();
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.timeout = options.timeout || 5000;
        this.queue = [];
        this.processing = false;
    }

    register(name, url, options = {}) {
        this.webhooks.set(name, {
            url,
            method: options.method || 'POST',
            headers: options.headers || {},
            events: options.events || [],
            enabled: options.enabled !== false,
            secret: options.secret,
            stats: {
                sent: 0,
                failed: 0,
                lastSent: null,
                lastError: null
            }
        });
    }

    unregister(name) {
        return this.webhooks.delete(name);
    }

    async trigger(eventName, data) {
        const webhooksToTrigger = Array.from(this.webhooks.entries())
            .filter(([_, webhook]) => 
                webhook.enabled && 
                (webhook.events.length === 0 || webhook.events.includes(eventName))
            );

        const results = await Promise.allSettled(
            webhooksToTrigger.map(([name, webhook]) => 
                this.send(name, eventName, data)
            )
        );

        return {
            triggered: webhooksToTrigger.length,
            successful: results.filter(r => r.status === 'fulfilled').length,
            failed: results.filter(r => r.status === 'rejected').length,
            results
        };
    }

    async send(name, eventName, data) {
        const webhook = this.webhooks.get(name);
        if (!webhook || !webhook.enabled) {
            throw new Error(`Webhook ${name} not found or disabled`);
        }

        const payload = {
            event: eventName,
            data,
            timestamp: Date.now(),
            webhook: name
        };

        if (webhook.secret) {
            payload.signature = this.generateSignature(payload, webhook.secret);
        }

        let lastError;
        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(webhook.url, {
                    method: webhook.method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...webhook.headers
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                webhook.stats.sent++;
                webhook.stats.lastSent = Date.now();
                
                return await response.json().catch(() => ({ success: true }));
            } catch (error) {
                lastError = error;
                if (attempt < this.retryAttempts - 1) {
                    await new Promise(resolve => 
                        setTimeout(resolve, this.retryDelay * (attempt + 1))
                    );
                }
            }
        }

        webhook.stats.failed++;
        webhook.stats.lastError = lastError.message;
        throw lastError;
    }

    generateSignature(payload, secret) {
        const crypto = require('crypto');
        return crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');
    }

    getWebhook(name) {
        return this.webhooks.get(name);
    }

    getAllWebhooks() {
        return Array.from(this.webhooks.entries()).map(([name, webhook]) => ({
            name,
            ...webhook
        }));
    }

    enable(name) {
        const webhook = this.webhooks.get(name);
        if (webhook) {
            webhook.enabled = true;
            return true;
        }
        return false;
    }

    disable(name) {
        const webhook = this.webhooks.get(name);
        if (webhook) {
            webhook.enabled = false;
            return true;
        }
        return false;
    }

    getStats(name) {
        if (name) {
            const webhook = this.webhooks.get(name);
            return webhook ? webhook.stats : null;
        }

        const allStats = {};
        for (const [name, webhook] of this.webhooks.entries()) {
            allStats[name] = webhook.stats;
        }
        return allStats;
    }

    resetStats(name) {
        const webhook = this.webhooks.get(name);
        if (webhook) {
            webhook.stats = {
                sent: 0,
                failed: 0,
                lastSent: null,
                lastError: null
            };
            return true;
        }
        return false;
    }
}
