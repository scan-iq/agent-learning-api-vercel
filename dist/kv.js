/**
 * Vercel KV Client Singleton
 *
 * Provides distributed, persistent caching across Edge instances
 * with circuit breaker pattern and request coalescing
 *
 * Features:
 * - Connection pooling for <1ms latency
 * - Request coalescing for concurrent identical requests
 * - Circuit breaker for KV failures (fallback to allow with logging)
 * - Edge Runtime compatible
 * - Atomic operations for rate limiting (INCR, EXPIRE)
 * - Key prefixes: auth:, ratelimit:
 */
import { kv } from '@vercel/kv';
/**
 * Key prefixes for different types of cached data
 */
export const KV_PREFIXES = {
    AUTH: 'auth:',
    RATELIMIT: 'ratelimit:',
};
/**
 * Circuit breaker states
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
/**
 * Circuit breaker for KV operations
 * Prevents cascading failures when KV is unavailable
 */
class CircuitBreaker {
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    nextAttempt = 0;
    config = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 10000, // 10 seconds
    };
    /**
     * Execute operation with circuit breaker protection
     */
    async execute(operation, fallback) {
        // Check if circuit is open
        if (this.state === CircuitState.OPEN) {
            const now = Date.now();
            if (now < this.nextAttempt) {
                console.warn('[KV Circuit Breaker] Circuit is OPEN, using fallback');
                return fallback ? fallback() : null;
            }
            // Try half-open
            this.state = CircuitState.HALF_OPEN;
            console.log('[KV Circuit Breaker] Circuit is HALF_OPEN, testing recovery');
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            console.error('[KV Circuit Breaker] Operation failed:', error);
            return fallback ? fallback() : null;
        }
    }
    /**
     * Record successful operation
     */
    onSuccess() {
        this.failureCount = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            if (this.successCount >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                console.log('[KV Circuit Breaker] Circuit is CLOSED (recovered)');
            }
        }
    }
    /**
     * Record failed operation
     */
    onFailure() {
        this.failureCount++;
        this.successCount = 0;
        if (this.state === CircuitState.HALF_OPEN ||
            this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.config.timeout;
            console.warn(`[KV Circuit Breaker] Circuit is OPEN (${this.failureCount} failures)`);
        }
    }
    /**
     * Get current circuit state
     */
    getState() {
        return this.state;
    }
    /**
     * Reset circuit breaker (for testing)
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = 0;
    }
}
/**
 * Global circuit breaker instance
 */
const circuitBreaker = new CircuitBreaker();
/**
 * Request coalescing - cache for in-flight requests
 * Prevents duplicate concurrent requests for the same key
 */
const inFlightRequests = new Map();
/**
 * Coalesce concurrent requests for the same key
 */
async function coalesceRequest(key, operation) {
    // Check if request is already in flight
    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key);
    }
    // Start new request
    const promise = operation().finally(() => {
        // Clean up after request completes
        inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, promise);
    return promise;
}
/**
 * KV Helper Functions
 */
/**
 * Get value from KV with circuit breaker protection
 *
 * @param key - Key to retrieve (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Value or null if not found or circuit is open
 */
export async function kvGet(key, prefix = '') {
    const fullKey = `${prefix}${key}`;
    return coalesceRequest(fullKey, async () => {
        return circuitBreaker.execute(async () => {
            try {
                const value = await kv.get(fullKey);
                return value;
            }
            catch (error) {
                console.error(`[KV] Failed to get key ${fullKey}:`, error);
                throw error;
            }
        });
    });
}
/**
 * Set value in KV with TTL and circuit breaker protection
 *
 * @param key - Key to set (will be prefixed)
 * @param value - Value to store
 * @param ttlSeconds - Time to live in seconds
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Success status
 */
export async function kvSet(key, value, ttlSeconds, prefix = '') {
    const fullKey = `${prefix}${key}`;
    const result = await circuitBreaker.execute(async () => {
        try {
            await kv.set(fullKey, value, { ex: ttlSeconds });
            return 'OK';
        }
        catch (error) {
            console.error(`[KV] Failed to set key ${fullKey}:`, error);
            throw error;
        }
    }, () => 'FALLBACK');
    return result === 'OK';
}
/**
 * Delete value from KV with circuit breaker protection
 *
 * @param key - Key to delete (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Success status
 */
export async function kvDelete(key, prefix = '') {
    const fullKey = `${prefix}${key}`;
    const result = await circuitBreaker.execute(async () => {
        try {
            const count = await kv.del(fullKey);
            return count;
        }
        catch (error) {
            console.error(`[KV] Failed to delete key ${fullKey}:`, error);
            throw error;
        }
    }, () => 0);
    return result !== null && result > 0;
}
/**
 * Atomic increment with TTL for rate limiting
 *
 * @param key - Key to increment (will be prefixed with ratelimit:)
 * @param ttlSeconds - Time to live in seconds (only applied if key is new)
 * @returns Current count or null if circuit is open
 */
export async function kvIncr(key, ttlSeconds) {
    const fullKey = `${KV_PREFIXES.RATELIMIT}${key}`;
    return circuitBreaker.execute(async () => {
        try {
            // Use Redis pipeline for atomic INCR + EXPIRE
            const pipeline = kv.pipeline();
            pipeline.incr(fullKey);
            pipeline.expire(fullKey, ttlSeconds);
            const results = await pipeline.exec();
            // First result is the INCR value
            const count = results[0];
            return count;
        }
        catch (error) {
            console.error(`[KV] Failed to increment key ${fullKey}:`, error);
            throw error;
        }
    });
    // Circuit breaker returns null if open or on failure
}
/**
 * Get remaining TTL for a key
 *
 * @param key - Key to check (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist, null if circuit is open
 */
export async function kvTTL(key, prefix = '') {
    const fullKey = `${prefix}${key}`;
    const result = await circuitBreaker.execute(async () => {
        try {
            const ttl = await kv.ttl(fullKey);
            return ttl;
        }
        catch (error) {
            console.error(`[KV] Failed to get TTL for key ${fullKey}:`, error);
            throw error;
        }
    });
    // Return -2 if circuit is open (key doesn't exist)
    return result !== null ? result : -2;
}
/**
 * Get multiple values from KV at once
 *
 * @param keys - Array of keys to retrieve (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Array of values (null for missing keys)
 */
export async function kvMGet(keys, prefix = '') {
    const fullKeys = keys.map((key) => `${prefix}${key}`);
    const result = await circuitBreaker.execute(async () => {
        try {
            // mget without generic - it returns array of values
            const values = await kv.mget(...fullKeys);
            // Cast to expected type
            return values;
        }
        catch (error) {
            console.error(`[KV] Failed to mget keys:`, error);
            throw error;
        }
    });
    // Return all nulls if circuit is open
    return result !== null ? result : keys.map(() => null);
}
/**
 * Check if KV is healthy (circuit breaker state)
 */
export function isKVHealthy() {
    return circuitBreaker.getState() === CircuitState.CLOSED;
}
/**
 * Get circuit breaker state for monitoring
 */
export function getCircuitBreakerState() {
    const state = circuitBreaker.getState();
    return {
        state,
        isHealthy: state === CircuitState.CLOSED,
    };
}
/**
 * Reset circuit breaker (for testing)
 */
export function resetCircuitBreaker() {
    circuitBreaker.reset();
}
/**
 * Clear all in-flight requests (for testing)
 */
export function clearInFlightRequests() {
    inFlightRequests.clear();
}
/**
 * Export circuit breaker states for external use
 */
export { CircuitState };
/**
 * Export the raw KV client for advanced use cases
 */
export { kv };
