import { DEFAULT_ORIGIN } from '../../Defaults/index.js';
import { AbstractSocketClient } from './types.js';

export class WebSocketClient extends AbstractSocketClient {
    constructor() {
        super(...arguments);
        this.socket = null;
        this._readyState = 3; // CLOSED
    }

    get isOpen() {
        return this._readyState === 1; // OPEN
    }

    get isClosed() {
        return this.socket === null || this._readyState === 3; // CLOSED
    }

    get isClosing() {
        return this.socket === null || this._readyState === 2; // CLOSING
    }

    get isConnecting() {
        return this._readyState === 0; // CONNECTING
    }

    connect() {
        if (this.socket) {
            return;
        }

        this._readyState = 0; // CONNECTING

        const headers = {
            'Origin': DEFAULT_ORIGIN,
            ...(this.config.options?.headers || {})
        };

        this.socket = new WebSocket(this.url, {
            headers
        });

        this.socket.onopen = (event) => {
            this._readyState = 1; // OPEN
            this.emit('open', event);
        };

        this.socket.onmessage = (event) => {
            this.emit('message', event.data);
        };

        this.socket.onerror = (event) => {
            this.emit('error', event);
        };

        this.socket.onclose = (event) => {
            this._readyState = 3; // CLOSED
            this.emit('close', event.code, event.reason);
            this.socket = null;
        };

        // Timeout handling
        if (this.config.connectTimeoutMs) {
            const timeout = setTimeout(() => {
                if (this._readyState === 0) { // Still CONNECTING
                    this.close();
                    this.emit('error', new Error('Connection timeout'));
                }
            }, this.config.connectTimeoutMs);

            // Clear timeout on successful connection
            const originalOnOpen = this.socket.onopen;
            this.socket.onopen = (event) => {
                clearTimeout(timeout);
                if (originalOnOpen) originalOnOpen.call(this.socket, event);
            };
        }
    }

    close() {
        if (!this.socket) {
            return;
        }

        this._readyState = 2; // CLOSING
        this.socket.close();
        this.socket = null;
        this._readyState = 3; // CLOSED
    }

    send(str, cb) {
        if (!this.socket || this._readyState !== 1) {
            if (cb) cb(new Error('WebSocket is not open'));
            return false;
        }

        try {
            this.socket.send(str);
            if (cb) cb();
            return true;
        } catch (error) {
            if (cb) cb(error);
            return false;
        }
    }
}
//# sourceMappingURL=websocket.js.map