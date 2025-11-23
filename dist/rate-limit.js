/**
 * Distributed rate limiting for iris-prime-api using Vercel KV
 *
 * Provides distributed token bucket rate limiting with atomic operations
 * Uses Vercel KV for persistence across Edge instances
 */
import { RateLimitError, logRateLimit } from './errors';
import { kvIncr, kvGet, kvTTL, kvDelete, KV_PREFIXES } from './kv.js';
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
export async function checkRateLimit(key, maxRequests = 100, windowMs = 60_000) {
    const windowSeconds = Math.ceil(windowMs / 1000);
    try {
        // Use atomic increment with TTL
        const count = await kvIncr(key, windowSeconds);
        // If circuit is open (count is null), allow request with logging
        if (count === null) {
            console.warn(`[Rate Limit] KV unavailable for key ${key}, allowing request`);
            return true;
        }
        // Check if over limit
        if (count > maxRequests) {
            const ttl = await kvTTL(key, KV_PREFIXES.RATELIMIT);
            const resetAt = ttl && ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + windowMs;
            logRateLimit(key, {
                count,
                maxRequests,
                resetAt: new Date(resetAt).toISOString(),
            });
            return false;
        }
        return true;
    }
    catch (error) {
        console.error(`[Rate Limit] Error checking rate limit for key ${key}:`, error);
        // Fail open - allow request if KV is down
        return true;
    }
}
/**
 * Rate limit middleware-style function
 * Throws RateLimitError if limit exceeded
 *
 * @param key - Unique identifier for rate limiting
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export async function rateLimit(key, maxRequests = 100, windowMs = 60_000) {
    const allowed = await checkRateLimit(key, maxRequests, windowMs);
    if (!allowed) {
        const ttl = await kvTTL(key, KV_PREFIXES.RATELIMIT);
        const resetAt = ttl && ttl > 0 ? new Date(Date.now() + (ttl * 1000)).toISOString() : undefined;
        const retryAfter = ttl && ttl > 0 ? ttl : Math.ceil(windowMs / 1000);
        throw new RateLimitError('Rate limit exceeded', {
            key,
            maxRequests,
            windowMs,
            resetAt,
            retryAfter,
        });
    }
}
/**
 * Get rate limit status for a key
 * Useful for adding X-RateLimit headers
 */
export async function getRateLimitStatus(key, maxRequests = 100) {
    try {
        // Get current count from KV
        const count = await kvGet(key, KV_PREFIXES.RATELIMIT);
        if (count === null || count === undefined) {
            return {
                limit: maxRequests,
                remaining: maxRequests,
            };
        }
        // Get TTL to calculate reset time
        const ttl = await kvTTL(key, KV_PREFIXES.RATELIMIT);
        const resetAt = ttl && ttl > 0 ? new Date(Date.now() + (ttl * 1000)).toISOString() : undefined;
        return {
            limit: maxRequests,
            remaining: Math.max(0, maxRequests - count),
            reset: resetAt,
        };
    }
    catch (error) {
        console.error(`[Rate Limit] Error getting status for key ${key}:`, error);
        // Return default values if KV is down
        return {
            limit: maxRequests,
            remaining: maxRequests,
        };
    }
}
/**
 * Rate limit by IP address
 */
export async function rateLimitByIp(ip, maxRequests = 100, windowMs = 60_000) {
    await rateLimit(`ip:${ip}`, maxRequests, windowMs);
}
/**
 * Rate limit by API key / project ID
 */
export async function rateLimitByApiKey(projectId, maxRequests = 1000, windowMs = 60_000) {
    await rateLimit(`apikey:${projectId}`, maxRequests, windowMs);
}
/**
 * Combined rate limiting - checks both IP and API key
 */
export async function rateLimitCombined(ip, projectId, ipLimits = { maxRequests: 100, windowMs: 60_000 }, apiKeyLimits = { maxRequests: 1000, windowMs: 60_000 }) {
    // Check IP limit first (stricter)
    await rateLimitByIp(ip, ipLimits.maxRequests, ipLimits.windowMs);
    // Then check API key limit
    await rateLimitByApiKey(projectId, apiKeyLimits.maxRequests, apiKeyLimits.windowMs);
}
/**
 * Reset rate limit for a specific key
 * Useful for testing or admin overrides
 */
export async function resetRateLimit(key) {
    await kvDelete(key, KV_PREFIXES.RATELIMIT);
}
/**
 * Clear all rate limit data
 * Note: KV doesn't support clearing all keys easily
 * This is a no-op for KV-based implementation
 */
export function clearAllRateLimits() {
    console.warn('[Rate Limit] clearAllRateLimits is not supported with KV. Use resetRateLimit for individual keys.');
}
/**
 * Get current store size (for monitoring)
 * Note: KV doesn't support getting store size
 * Returns a message instead
 */
export function getRateLimitStoreSize() {
    return 'Rate limiting is now using Vercel KV - store size not available';
}
