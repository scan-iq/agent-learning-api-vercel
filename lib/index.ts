/**
 * Iris API - Production-grade authentication and validation
 *
 * Main entry point for the API library
 */

// Re-export all authentication utilities
export {
  extractApiKey,
  validateApiKey,
  requireAuth,
  getAuthContext,
  optionalAuth,
  clearAuthCache,
  getAuthCacheStats,
  withAuth,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
} from './auth';

// Re-export all validation utilities
export {
  validateTelemetryEvent,
  validateSignatureEvent,
  validateReflexionEvent,
  validateConsensusEvent,
  parseJsonBody,
  validateQueryParams,
} from './validation';

// Re-export all rate limiting utilities
export {
  checkRateLimit,
  rateLimit,
  getRateLimitStatus,
  rateLimitByIp,
  rateLimitByApiKey,
  rateLimitCombined,
  resetRateLimit,
  clearAllRateLimits,
  getRateLimitStoreSize,
} from './rate-limit';

// Re-export all error classes and handlers
export {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  handleApiError,
  errorToResponse,
  logAuthFailure,
  logRateLimit,
} from './errors';

// Re-export all types
export type {
  TelemetryEvent,
  SignatureEvent,
  ReflexionEvent,
  ConsensusEvent,
  ProjectConfig,
  AuthContext,
  RateLimitConfig,
  RateLimitEntry,
  ErrorResponse,
  ExecutionResult,
  IrisCodeResult,
  SandboxConfig,
  CodeExecutionRequest,
  CodeExecutionResponse,
  PatternDiscoveryConfig,
  ReflexionEvaluation,
  ConsensusVote,
  TelemetryLog,
  PromptTemplate,
  LineageEntry,
  MetricRecord,
} from './types';

// Re-export E2B executor utilities
export {
  IrisCodeExecutor,
  getExecutor,
  resetExecutor,
} from './e2b-executor';

export type { E2BExecutorConfig } from './e2b-executor';

// Re-export sandbox setup utilities
export {
  setupIrisSandbox,
  installPackages,
  configureSandboxEnv,
  healthCheck,
} from './setup-e2b-sandbox';

export type {
  SandboxSetupOptions,
  SandboxSetupResult,
} from './setup-e2b-sandbox';

// Version
export const VERSION = '1.0.0';
