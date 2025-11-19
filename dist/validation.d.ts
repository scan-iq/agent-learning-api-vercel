/**
 * Request validation for iris-prime-api
 *
 * Validates incoming event payloads using runtime type checking
 */
import type { TelemetryEvent, SignatureEvent, ReflexionEvent, ConsensusEvent } from './types';
/**
 * Validate telemetry event payload
 */
export declare function validateTelemetryEvent(data: unknown): TelemetryEvent;
/**
 * Validate signature event payload
 */
export declare function validateSignatureEvent(data: unknown): SignatureEvent;
/**
 * Validate reflexion event payload
 */
export declare function validateReflexionEvent(data: unknown): ReflexionEvent;
/**
 * Validate consensus event payload
 */
export declare function validateConsensusEvent(data: unknown): ConsensusEvent;
/**
 * Parse and validate JSON request body
 */
export declare function parseJsonBody<T>(request: Request, validator: (data: unknown) => T): Promise<T>;
/**
 * Validate query parameters
 */
export declare function validateQueryParams(url: URL, required?: string[], optional?: string[]): Record<string, string>;
//# sourceMappingURL=validation.d.ts.map