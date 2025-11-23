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
export declare const KV_PREFIXES: {
    readonly AUTH: "auth:";
    readonly RATELIMIT: "ratelimit:";
};
/**
 * Circuit breaker states
 */
declare enum CircuitState {
    CLOSED = "CLOSED",// Normal operation
    OPEN = "OPEN",// Failing, reject requests
    HALF_OPEN = "HALF_OPEN"
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
export declare function kvGet<T = any>(key: string, prefix?: string): Promise<T | null>;
/**
 * Set value in KV with TTL and circuit breaker protection
 *
 * @param key - Key to set (will be prefixed)
 * @param value - Value to store
 * @param ttlSeconds - Time to live in seconds
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Success status
 */
export declare function kvSet<T = any>(key: string, value: T, ttlSeconds: number, prefix?: string): Promise<boolean>;
/**
 * Delete value from KV with circuit breaker protection
 *
 * @param key - Key to delete (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Success status
 */
export declare function kvDelete(key: string, prefix?: string): Promise<boolean>;
/**
 * Atomic increment with TTL for rate limiting
 *
 * @param key - Key to increment (will be prefixed with ratelimit:)
 * @param ttlSeconds - Time to live in seconds (only applied if key is new)
 * @returns Current count or null if circuit is open
 */
export declare function kvIncr(key: string, ttlSeconds: number): Promise<number | null>;
/**
 * Get remaining TTL for a key
 *
 * @param key - Key to check (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist, null if circuit is open
 */
export declare function kvTTL(key: string, prefix?: string): Promise<number | null>;
/**
 * Get multiple values from KV at once
 *
 * @param keys - Array of keys to retrieve (will be prefixed)
 * @param prefix - Key prefix (auth: or ratelimit:)
 * @returns Array of values (null for missing keys)
 */
export declare function kvMGet<T = any>(keys: string[], prefix?: string): Promise<Array<T | null>>;
/**
 * Check if KV is healthy (circuit breaker state)
 */
export declare function isKVHealthy(): boolean;
/**
 * Get circuit breaker state for monitoring
 */
export declare function getCircuitBreakerState(): {
    state: CircuitState;
    isHealthy: boolean;
};
/**
 * Reset circuit breaker (for testing)
 */
export declare function resetCircuitBreaker(): void;
/**
 * Clear all in-flight requests (for testing)
 */
export declare function clearInFlightRequests(): void;
/**
 * Export circuit breaker states for external use
 */
export { CircuitState };
/**
 * Export the raw KV client for advanced use cases
 */
export { kv };
//# sourceMappingURL=kv.d.ts.map