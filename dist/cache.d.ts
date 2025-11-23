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
/**
 * Cache interface (can be implemented by different backends)
 */
interface CacheBackend {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * Cache client with metrics
 */
export declare class Cache {
    private backend;
    private coalescer;
    private name;
    constructor(backend: CacheBackend, name?: string);
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    /**
     * Delete from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Clear all cache entries
     */
    clear(): Promise<void>;
    /**
     * Get or compute value with caching
     */
    getOrCompute<T>(key: string, compute: () => Promise<T>, ttl: number): Promise<T>;
    /**
     * Get cache hit rate
     */
    getHitRate(): number;
}
/**
 * Create cache instance
 */
export declare function createCache(options: {
    name?: string;
    maxSize?: number;
    kv?: any;
}): Cache;
/**
 * Initialize caches
 */
export declare function initializeCaches(kv?: any): void;
/**
 * Get auth cache
 */
export declare function getAuthCache(): Cache;
/**
 * Get rate limit cache
 */
export declare function getRateLimitCache(): Cache;
/**
 * Get query cache
 */
export declare function getQueryCache(): Cache;
/**
 * Cache statistics
 */
export declare function getCacheStats(): {
    auth: {
        hitRate: number;
    };
    rateLimit: {
        hitRate: number;
    };
    query: {
        hitRate: number;
    };
};
/**
 * HTTP response caching utilities
 */
export declare const httpCache: {
    /**
     * Set cache control headers
     */
    setCacheHeaders(res: any, options: {
        maxAge?: number;
        sMaxAge?: number;
        staleWhileRevalidate?: number;
        staleIfError?: number;
        public?: boolean;
    }): void;
    /**
     * Generate ETag from content
     */
    generateETag(content: string | object): string;
    /**
     * Check if request matches ETag (conditional request)
     */
    checkETag(req: any, etag: string): boolean;
    /**
     * Send 304 Not Modified response
     */
    sendNotModified(res: any, etag: string): void;
    /**
     * Send response with ETag
     */
    sendWithETag(res: any, content: any, etag?: string): void;
};
/**
 * Optimize: Add Vary header for proper caching
 */
export declare function setVaryHeader(res: any, headers: string[]): void;
export {};
//# sourceMappingURL=cache.d.ts.map