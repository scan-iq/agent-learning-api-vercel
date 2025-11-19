/**
 * In-memory rate limiting for iris-prime-api
 *
 * Provides simple token bucket rate limiting
 * For production: Consider Redis or distributed solutions
 */

import { RateLimitError, logRateLimit } from './errors';
import type { RateLimitEntry } from './types';

/**
 * In-memory store for rate limit tracking
 * Key format: "ip:{ip}" or "apikey:{projectId}" or "custom:{key}"
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries every 60 seconds
 */
const CLEANUP_INTERVAL = 60_000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer(): void {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Allow Node.js to exit even if timer is active
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check if a rate limit key is within limits
 *
 * @param key - Unique identifier for rate limiting (IP, API key, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60_000
): boolean {
  startCleanupTimer();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry exists - create new one
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Entry expired - reset
  if (entry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  // Entry exists and valid - check count
  if (entry.count >= maxRequests) {
    logRateLimit(key, {
      count: entry.count,
      maxRequests,
      resetAt: new Date(entry.resetAt).toISOString(),
    });
    return false;
  }

  // Increment count
  entry.count++;
  return true;
}

/**
 * Rate limit middleware-style function
 * Throws RateLimitError if limit exceeded
 *
 * @param key - Unique identifier for rate limiting
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60_000
): void {
  const allowed = checkRateLimit(key, maxRequests, windowMs);

  if (!allowed) {
    const entry = rateLimitStore.get(key);
    const resetAt = entry ? new Date(entry.resetAt).toISOString() : undefined;

    throw new RateLimitError('Rate limit exceeded', {
      key,
      maxRequests,
      windowMs,
      resetAt,
      retryAfter: entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : undefined,
    });
  }
}

/**
 * Get rate limit status for a key
 * Useful for adding X-RateLimit headers
 */
export function getRateLimitStatus(key: string, maxRequests: number = 100): {
  limit: number;
  remaining: number;
  reset?: string;
} {
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= Date.now()) {
    return {
      limit: maxRequests,
      remaining: maxRequests,
    };
  }

  return {
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    reset: new Date(entry.resetAt).toISOString(),
  };
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIp(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60_000
): void {
  rateLimit(`ip:${ip}`, maxRequests, windowMs);
}

/**
 * Rate limit by API key / project ID
 */
export function rateLimitByApiKey(
  projectId: string,
  maxRequests: number = 1000,
  windowMs: number = 60_000
): void {
  rateLimit(`apikey:${projectId}`, maxRequests, windowMs);
}

/**
 * Combined rate limiting - checks both IP and API key
 */
export function rateLimitCombined(
  ip: string,
  projectId: string,
  ipLimits: { maxRequests: number; windowMs: number } = { maxRequests: 100, windowMs: 60_000 },
  apiKeyLimits: { maxRequests: number; windowMs: number } = { maxRequests: 1000, windowMs: 60_000 }
): void {
  // Check IP limit first (stricter)
  rateLimitByIp(ip, ipLimits.maxRequests, ipLimits.windowMs);

  // Then check API key limit
  rateLimitByApiKey(projectId, apiKeyLimits.maxRequests, apiKeyLimits.windowMs);
}

/**
 * Reset rate limit for a specific key
 * Useful for testing or admin overrides
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit data
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Stop cleanup timer
 * Useful for graceful shutdown
 */
export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Get current store size (for monitoring)
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
