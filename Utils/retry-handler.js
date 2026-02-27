export class RetryHandler {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.baseDelay = options.baseDelay || 1000;
        this.maxDelay = options.maxDelay || 30000;
        this.backoffMultiplier = options.backoffMultiplier || 2;
        this.retryableErrors = options.retryableErrors || [];
        this.onRetry = options.onRetry || (() => {});
    }

    async execute(fn, context = {}) {
        let lastError;
        
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt === this.maxRetries) {
                    break;
                }

                if (this.retryableErrors.length > 0 && !this.isRetryable(error)) {
                    throw error;
                }

                const delay = this.calculateDelay(attempt);
                
                this.onRetry({
                    attempt: attempt + 1,
                    maxRetries: this.maxRetries,
                    delay,
                    error,
                    context
                });

                await this.sleep(delay);
            }
        }

        throw lastError;
    }

    calculateDelay(attempt) {
        const delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
        const jitter = Math.random() * 0.3 * delay;
        return Math.min(delay + jitter, this.maxDelay);
    }

    isRetryable(error) {
        if (this.retryableErrors.length === 0) {
            return true;
        }

        return this.retryableErrors.some(retryableError => {
            if (typeof retryableError === 'string') {
                return error.message.includes(retryableError);
            }
            if (retryableError instanceof RegExp) {
                return retryableError.test(error.message);
            }
            if (typeof retryableError === 'function') {
                return error instanceof retryableError;
            }
            return false;
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setMaxRetries(maxRetries) {
        this.maxRetries = maxRetries;
    }

    setBaseDelay(baseDelay) {
        this.baseDelay = baseDelay;
    }
}
