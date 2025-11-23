/**
 * Distributed rate limiting for iris-prime-api using Vercel KV
 *
 * Provides distributed token bucket rate limiting with atomic operations
 * Uses Vercel KV for persistence across Edge instances
 */
/**
 * Rate limit entry structure in KV
 * Key format: "ratelimit:ip:{ip}" or "ratelimit:apikey:{projectId}" or "ratelimit:custom:{key}"
 */
/**
 * Check if a rate limit key is within limits using atomic KV operations
 *
 * @param key - Unique identifier for rate limiting (IP, API key, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export declare function checkRateLimit(key: string, maxRequests?: number, windowMs?: number): Promise<boolean>;
/**
 * Rate limit middleware-style function
 * Throws RateLimitError if limit exceeded
 *
 * @param key - Unique identifier for rate limiting
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export declare function rateLimit(key: string, maxRequests?: number, windowMs?: number): Promise<void>;
/**
 * Get rate limit status for a key
 * Useful for adding X-RateLimit headers
 */
export declare function getRateLimitStatus(key: string, maxRequests?: number): Promise<{
    limit: number;
    remaining: number;
    reset?: string;
}>;
/**
 * Rate limit by IP address
 */
export declare function rateLimitByIp(ip: string, maxRequests?: number, windowMs?: number): Promise<void>;
/**
 * Rate limit by API key / project ID
 */
export declare function rateLimitByApiKey(projectId: string, maxRequests?: number, windowMs?: number): Promise<void>;
/**
 * Combined rate limiting - checks both IP and API key
 */
export declare function rateLimitCombined(ip: string, projectId: string, ipLimits?: {
    maxRequests: number;
    windowMs: number;
}, apiKeyLimits?: {
    maxRequests: number;
    windowMs: number;
}): Promise<void>;
/**
 * Reset rate limit for a specific key
 * Useful for testing or admin overrides
 */
export declare function resetRateLimit(key: string): Promise<void>;
/**
 * Clear all rate limit data
 * Note: KV doesn't support clearing all keys easily
 * This is a no-op for KV-based implementation
 */
export declare function clearAllRateLimits(): void;
/**
 * Get current store size (for monitoring)
 * Note: KV doesn't support getting store size
 * Returns a message instead
 */
export declare function getRateLimitStoreSize(): string;
//# sourceMappingURL=rate-limit.d.ts.map