/**
 * Unified Cache Layer with Vercel KV and In-Memory Fallback
 *
 * Provides high-performance caching with:
 * - Vercel KV for distributed caching (production)
 * - In-memory LRU cache for development/fallback
 * - Automatic metrics tracking
 * - Request coalescing (dedupe concurrent identical requests)
 *
 * Target performance:
 * - KV cache hit: <5ms
 * - Memory cache hit: <1ms
 * - Cache hit rate: >90%
 */
import { cacheMetrics } from './observability.js';
/**
 * In-memory LRU cache implementation
 */
class MemoryCache {
    cache = new Map();
    maxSize;
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        // Cleanup expired entries every 60 seconds
        if (typeof setInterval !== 'undefined') {
            setInterval(() => this.cleanup(), 60000);
        }
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        // Check expiration
        if (entry.expiresAt <= Date.now()) {
            this.cache.delete(key);
            return null;
        }
        // Move to end (LRU)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    async set(key, value, ttl) {
        const expiresAt = Date.now() + ttl;
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, { value, expiresAt });
    }
    async delete(key) {
        this.cache.delete(key);
    }
    async clear() {
        this.cache.clear();
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
            }
        }
    }
    get size() {
        return this.cache.size;
    }
}
/**
 * Vercel KV cache implementation
 */
class VercelKVCache {
    kv;
    constructor(kv) {
        this.kv = kv;
    }
    async get(key) {
        try {
            const value = await this.kv.get(key);
            return value;
        }
        catch (error) {
            console.warn('KV get failed:', error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            // Vercel KV TTL is in seconds
            await this.kv.set(key, value, { ex: Math.ceil(ttl / 1000) });
        }
        catch (error) {
            console.warn('KV set failed:', error);
        }
    }
    async delete(key) {
        try {
            await this.kv.del(key);
        }
        catch (error) {
            console.warn('KV delete failed:', error);
        }
    }
    async clear() {
        // Vercel KV doesn't support clear all
        console.warn('KV clear not supported');
    }
}
/**
 * Two-tier cache (L1: memory, L2: KV)
 */
class TwoTierCache {
    l1;
    l2;
    constructor(l1, l2) {
        this.l1 = l1;
        this.l2 = l2;
    }
    async get(key) {
        // Check L1 (memory) first
        let value = await this.l1.get(key);
        if (value !== null) {
            return value;
        }
        // Check L2 (KV)
        value = await this.l2.get(key);
        if (value !== null) {
            // Backfill L1 with shorter TTL
            await this.l1.set(key, value, 60000); // 1 minute
        }
        return value;
    }
    async set(key, value, ttl) {
        // Write to both tiers
        await Promise.all([
            this.l1.set(key, value, ttl),
            this.l2.set(key, value, ttl),
        ]);
    }
    async delete(key) {
        await Promise.all([
            this.l1.delete(key),
            this.l2.delete(key),
        ]);
    }
    async clear() {
        await Promise.all([
            this.l1.clear(),
            this.l2.clear(),
        ]);
    }
}
/**
 * Request coalescing - dedupe concurrent identical requests
 */
class RequestCoalescer {
    pending = new Map();
    /**
     * Execute function with coalescing
     * If the same key is already in-flight, return the same promise
     */
    async coalesce(key, fn) {
        // Check if request is already in-flight
        const existing = this.pending.get(key);
        if (existing) {
            return existing;
        }
        // Execute and track
        const promise = fn().finally(() => {
            this.pending.delete(key);
        });
        this.pending.set(key, promise);
        return promise;
    }
    get size() {
        return this.pending.size;
    }
}
/**
 * Cache client with metrics
 */
export class Cache {
    backend;
    coalescer;
    name;
    constructor(backend, name = 'default') {
        this.backend = backend;
        this.coalescer = new RequestCoalescer();
        this.name = name;
    }
    /**
     * Get value from cache
     */
    async get(key) {
        const value = await this.backend.get(key);
        if (value !== null) {
            cacheMetrics.hit(this.name);
        }
        else {
            cacheMetrics.miss(this.name);
        }
        return value;
    }
    /**
     * Set value in cache
     */
    async set(key, value, ttl) {
        await this.backend.set(key, value, ttl);
    }
    /**
     * Delete from cache
     */
    async delete(key) {
        await this.backend.delete(key);
    }
    /**
     * Clear all cache entries
     */
    async clear() {
        await this.backend.clear();
    }
    /**
     * Get or compute value with caching
     */
    async getOrCompute(key, compute, ttl) {
        // Check cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        // Compute with coalescing (dedupe concurrent requests)
        const value = await this.coalescer.coalesce(key, compute);
        // Store in cache
        await this.set(key, value, ttl);
        return value;
    }
    /**
     * Get cache hit rate
     */
    getHitRate() {
        return cacheMetrics.getHitRate(this.name);
    }
}
/**
 * Create cache instance
 */
export function createCache(options) {
    const { name = 'default', maxSize = 1000, kv } = options;
    let backend;
    if (kv) {
        // Two-tier cache with KV
        const memCache = new MemoryCache(maxSize);
        const kvCache = new VercelKVCache(kv);
        backend = new TwoTierCache(memCache, kvCache);
    }
    else {
        // Memory-only cache
        backend = new MemoryCache(maxSize);
    }
    return new Cache(backend, name);
}
/**
 * Global caches
 */
let authCache = null;
let rateLimitCache = null;
let queryCache = null;
/**
 * Initialize caches
 */
export function initializeCaches(kv) {
    authCache = createCache({ name: 'auth', maxSize: 5000, kv });
    rateLimitCache = createCache({ name: 'rateLimit', maxSize: 10000, kv });
    queryCache = createCache({ name: 'query', maxSize: 1000, kv });
}
/**
 * Get auth cache
 */
export function getAuthCache() {
    if (!authCache) {
        initializeCaches();
    }
    return authCache;
}
/**
 * Get rate limit cache
 */
export function getRateLimitCache() {
    if (!rateLimitCache) {
        initializeCaches();
    }
    return rateLimitCache;
}
/**
 * Get query cache
 */
export function getQueryCache() {
    if (!queryCache) {
        initializeCaches();
    }
    return queryCache;
}
/**
 * Cache statistics
 */
export function getCacheStats() {
    return {
        auth: { hitRate: getAuthCache().getHitRate() },
        rateLimit: { hitRate: getRateLimitCache().getHitRate() },
        query: { hitRate: getQueryCache().getHitRate() },
    };
}
/**
 * HTTP response caching utilities
 */
export const httpCache = {
    /**
     * Set cache control headers
     */
    setCacheHeaders(res, options) {
        const directives = [];
        if (options.public) {
            directives.push('public');
        }
        else {
            directives.push('private');
        }
        if (options.maxAge !== undefined) {
            directives.push(`max-age=${options.maxAge}`);
        }
        if (options.sMaxAge !== undefined) {
            directives.push(`s-maxage=${options.sMaxAge}`);
        }
        if (options.staleWhileRevalidate !== undefined) {
            directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
        }
        if (options.staleIfError !== undefined) {
            directives.push(`stale-if-error=${options.staleIfError}`);
        }
        res.setHeader('Cache-Control', directives.join(', '));
    },
    /**
     * Generate ETag from content
     */
    generateETag(content) {
        const str = typeof content === 'string' ? content : JSON.stringify(content);
        // Simple hash function (for production, use crypto.createHash)
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `"${Math.abs(hash).toString(36)}"`;
    },
    /**
     * Check if request matches ETag (conditional request)
     */
    checkETag(req, etag) {
        const ifNoneMatch = req.headers['if-none-match'];
        return ifNoneMatch === etag;
    },
    /**
     * Send 304 Not Modified response
     */
    sendNotModified(res, etag) {
        res.setHeader('ETag', etag);
        res.status(304).end();
    },
    /**
     * Send response with ETag
     */
    sendWithETag(res, content, etag) {
        const computedETag = etag || this.generateETag(content);
        res.setHeader('ETag', computedETag);
        res.json(content);
    },
};
/**
 * Optimize: Add Vary header for proper caching
 */
export function setVaryHeader(res, headers) {
    res.setHeader('Vary', headers.join(', '));
}
