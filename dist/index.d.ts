/**
 * Iris API - Production-grade authentication and validation
 *
 * Main entry point for the API library
 */
export { extractApiKey, validateApiKey, requireAuth, getAuthContext, optionalAuth, clearAuthCache, getAuthCacheStats, withAuth, createApiKey, revokeApiKey, rotateApiKey, } from './auth';
export { validateTelemetryEvent, validateSignatureEvent, validateReflexionEvent, validateConsensusEvent, parseJsonBody, validateQueryParams, } from './validation';
export { checkRateLimit, rateLimit, getRateLimitStatus, rateLimitByIp, rateLimitByApiKey, rateLimitCombined, resetRateLimit, clearAllRateLimits, getRateLimitStoreSize, } from './rate-limit';
export { ApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, RateLimitError, InternalServerError, handleApiError, errorToResponse, logAuthFailure, logRateLimit, } from './errors';
export type { TelemetryEvent, SignatureEvent, ReflexionEvent, ConsensusEvent, ProjectConfig, AuthContext, RateLimitConfig, RateLimitEntry, ErrorResponse, ExecutionResult, IrisCodeResult, SandboxConfig, CodeExecutionRequest, CodeExecutionResponse, PatternDiscoveryConfig, ReflexionEvaluation, ConsensusVote, TelemetryLog, PromptTemplate, LineageEntry, MetricRecord, } from './types';
export { IrisCodeExecutor, getExecutor, resetExecutor, } from './e2b-executor';
export type { E2BExecutorConfig } from './e2b-executor';
export { setupIrisSandbox, installPackages, configureSandboxEnv, healthCheck, } from './setup-e2b-sandbox';
export type { SandboxSetupOptions, SandboxSetupResult, } from './setup-e2b-sandbox';
export declare const VERSION = "1.0.0";
//# sourceMappingURL=index.d.ts.map