/**
 * Standardized error handling for iris-prime-api
 *
 * Provides consistent error responses and logging
 */
export class ApiError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}
/**
 * Predefined error types for common scenarios
 */
export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized', details) {
        super(message, 401, 'UNAUTHORIZED', details);
        this.name = 'UnauthorizedError';
    }
}
export class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden', details) {
        super(message, 403, 'FORBIDDEN', details);
        this.name = 'ForbiddenError';
    }
}
export class NotFoundError extends ApiError {
    constructor(message = 'Not Found', details) {
        super(message, 404, 'NOT_FOUND', details);
        this.name = 'NotFoundError';
    }
}
export class ValidationError extends ApiError {
    constructor(message = 'Validation Failed', details) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
export class RateLimitError extends ApiError {
    constructor(message = 'Rate Limit Exceeded', details) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
        this.name = 'RateLimitError';
    }
}
export class InternalServerError extends ApiError {
    constructor(message = 'Internal Server Error', details) {
        super(message, 500, 'INTERNAL_ERROR', details);
        this.name = 'InternalServerError';
    }
}
/**
 * Convert any error to a standardized API error response
 */
export function handleApiError(error, path) {
    // Log error for monitoring
    console.error('[API Error]', {
        error,
        path,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
    });
    // Handle known ApiError instances
    if (error instanceof ApiError) {
        return {
            error: {
                message: error.message,
                code: error.code,
                statusCode: error.statusCode,
                details: error.details,
                timestamp: new Date().toISOString(),
                path,
            },
        };
    }
    // Handle validation errors from libraries like zod
    if (error && typeof error === 'object' && 'issues' in error) {
        return {
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                details: { issues: error.issues },
                timestamp: new Date().toISOString(),
                path,
            },
        };
    }
    // Handle generic errors
    if (error instanceof Error) {
        return {
            error: {
                message: error.message || 'Internal Server Error',
                code: 'INTERNAL_ERROR',
                statusCode: 500,
                timestamp: new Date().toISOString(),
                path,
            },
        };
    }
    // Handle unknown errors
    return {
        error: {
            message: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR',
            statusCode: 500,
            timestamp: new Date().toISOString(),
            path,
        },
    };
}
/**
 * Create a Response object from an error
 * Useful for edge runtime environments (Vercel, Cloudflare Workers, etc.)
 */
export function errorToResponse(error, path) {
    const errorResponse = handleApiError(error, path);
    return new Response(JSON.stringify(errorResponse), {
        status: errorResponse.error.statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
/**
 * Log authentication failures for security monitoring
 */
export function logAuthFailure(reason, metadata) {
    console.warn('[Auth Failure]', {
        reason,
        metadata,
        timestamp: new Date().toISOString(),
    });
}
/**
 * Log rate limit events
 */
export function logRateLimit(key, metadata) {
    console.warn('[Rate Limit]', {
        key,
        metadata,
        timestamp: new Date().toISOString(),
    });
}
