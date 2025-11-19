/**
 * In-memory rate limiting for iris-prime-api
 *
 * Provides simple token bucket rate limiting
 * For production: Consider Redis or distributed solutions
 */
/**
 * Check if a rate limit key is within limits
 *
 * @param key - Unique identifier for rate limiting (IP, API key, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export declare function checkRateLimit(key: string, maxRequests?: number, windowMs?: number): boolean;
/**
 * Rate limit middleware-style function
 * Throws RateLimitError if limit exceeded
 *
 * @param key - Unique identifier for rate limiting
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export declare function rateLimit(key: string, maxRequests?: number, windowMs?: number): void;
/**
 * Get rate limit status for a key
 * Useful for adding X-RateLimit headers
 */
export declare function getRateLimitStatus(key: string, maxRequests?: number): {
    limit: number;
    remaining: number;
    reset?: string;
};
/**
 * Rate limit by IP address
 */
export declare function rateLimitByIp(ip: string, maxRequests?: number, windowMs?: number): void;
/**
 * Rate limit by API key / project ID
 */
export declare function rateLimitByApiKey(projectId: string, maxRequests?: number, windowMs?: number): void;
/**
 * Combined rate limiting - checks both IP and API key
 */
export declare function rateLimitCombined(ip: string, projectId: string, ipLimits?: {
    maxRequests: number;
    windowMs: number;
}, apiKeyLimits?: {
    maxRequests: number;
    windowMs: number;
}): void;
/**
 * Reset rate limit for a specific key
 * Useful for testing or admin overrides
 */
export declare function resetRateLimit(key: string): void;
/**
 * Clear all rate limit data
 * Useful for testing
 */
export declare function clearAllRateLimits(): void;
/**
 * Stop cleanup timer
 * Useful for graceful shutdown
 */
export declare function stopCleanupTimer(): void;
/**
 * Get current store size (for monitoring)
 */
export declare function getRateLimitStoreSize(): number;
//# sourceMappingURL=rate-limit.d.ts.map