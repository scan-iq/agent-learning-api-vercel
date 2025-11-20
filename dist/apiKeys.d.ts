/**
 * API Key Management for IRIS
 *
 * Handles generation, hashing, validation, and lifecycle management of API keys.
 * Uses SHA-256 hashing for secure storage in Supabase.
 */
export interface ApiKeyRecord {
    id: string;
    project_id: string;
    project_name: string;
    api_key_hash: string;
    api_key_prefix: string;
    label: string;
    last_used_at: string | null;
    usage_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    revoked_at: string | null;
}
export interface CreateApiKeyParams {
    projectId: string;
    projectName: string;
    label: string;
}
export interface CreateApiKeyResult {
    apiKey: string;
    record: ApiKeyRecord;
}
/**
 * Generate a cryptographically secure API key
 * Format: sk_live_<base64url>
 */
export declare function generateApiKey(): string;
/**
 * Hash an API key using SHA-256
 * This is what gets stored in the database
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Extract display prefix from API key (first 8 chars)
 * Example: sk_live_AbCdEfGh1234... -> sk_live_
 */
export declare function getApiKeyPrefix(apiKey: string): string;
/**
 * Create a new API key for a project
 *
 * @returns The raw API key (only shown once!) and the database record
 */
export declare function createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult>;
/**
 * Find a project by API key hash
 * Used during authentication
 *
 * @param apiKey - Raw API key from request header
 * @returns Project info if key is valid and active, null otherwise
 */
export declare function findProjectByApiKey(apiKey: string): Promise<{
    projectId: string;
    projectName: string;
    keyId: string;
} | null>;
/**
 * Update last_used_at and increment usage_count for an API key
 * Called after successful authentication
 */
export declare function touchApiKeyUsage(keyId: string): Promise<void>;
/**
 * List all API keys for a project
 */
export declare function listApiKeys(projectId: string): Promise<ApiKeyRecord[]>;
/**
 * Revoke an API key (soft delete - sets is_active = false)
 */
export declare function revokeApiKey(keyId: string): Promise<void>;
/**
 * Delete an API key permanently
 * Use with caution - prefer revokeApiKey for soft delete
 */
export declare function deleteApiKey(keyId: string): Promise<void>;
/**
 * Rotate an API key - creates a new one and revokes the old one
 *
 * @param keyId - ID of the key to rotate
 * @returns New API key (only shown once!)
 */
export declare function rotateApiKey(keyId: string): Promise<CreateApiKeyResult>;
/**
 * Validate API key format
 */
export declare function isValidApiKeyFormat(apiKey: string): boolean;
//# sourceMappingURL=apiKeys.d.ts.map