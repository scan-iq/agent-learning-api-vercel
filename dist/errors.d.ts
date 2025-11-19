/**
 * Standardized error handling for iris-prime-api
 *
 * Provides consistent error responses and logging
 */
export declare class ApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: Record<string, any>;
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, any>);
}
/**
 * Predefined error types for common scenarios
 */
export declare class UnauthorizedError extends ApiError {
    constructor(message?: string, details?: Record<string, any>);
}
export declare class ForbiddenError extends ApiError {
    constructor(message?: string, details?: Record<string, any>);
}
export declare class NotFoundError extends ApiError {
    constructor(message?: string, details?: Record<string, any>);
}
export declare class ValidationError extends ApiError {
    constructor(message?: string, details?: Record<string, any>);
}
export declare class RateLimitError extends ApiError {
    constructor(message?: string, details?: Record<string, any>);
}
export declare class InternalServerError extends ApiError {
    constructor(message?: string, details?: Record<string, any>);
}
/**
 * Error response structure
 */
export interface ErrorResponse {
    error: {
        message: string;
        code: string;
        statusCode: number;
        details?: Record<string, any>;
        timestamp: string;
        path?: string;
    };
}
/**
 * Convert any error to a standardized API error response
 */
export declare function handleApiError(error: unknown, path?: string): ErrorResponse;
/**
 * Create a Response object from an error
 * Useful for edge runtime environments (Vercel, Cloudflare Workers, etc.)
 */
export declare function errorToResponse(error: unknown, path?: string): Response;
/**
 * Log authentication failures for security monitoring
 */
export declare function logAuthFailure(reason: string, metadata?: Record<string, any>): void;
/**
 * Log rate limit events
 */
export declare function logRateLimit(key: string, metadata?: Record<string, any>): void;
//# sourceMappingURL=errors.d.ts.map