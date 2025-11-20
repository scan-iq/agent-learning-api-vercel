/**
 * API Key Management for IRIS
 *
 * Handles generation, hashing, validation, and lifecycle management of API keys.
 * Uses SHA-256 hashing for secure storage in Supabase.
 */

import { createHash, randomBytes } from "crypto";
import { getSupabaseClient } from "./supabase.js";

/**
 * API Key format: sk_live_<32 random bytes base64url>
 * Example: sk_live_AbCdEfGh1234567890-_
 */
const API_KEY_PREFIX = "sk_live_";
const API_KEY_BYTES = 32;

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
  apiKey: string; // Only returned once!
  record: ApiKeyRecord;
}

/**
 * Generate a cryptographically secure API key
 * Format: sk_live_<base64url>
 */
export function generateApiKey(): string {
  const bytes = randomBytes(API_KEY_BYTES);
  const base64url = bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${API_KEY_PREFIX}${base64url}`;
}

/**
 * Hash an API key using SHA-256
 * This is what gets stored in the database
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Extract display prefix from API key (first 8 chars)
 * Example: sk_live_AbCdEfGh1234... -> sk_live_
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, Math.min(12, apiKey.length)) + "...";
}

/**
 * Create a new API key for a project
 *
 * @returns The raw API key (only shown once!) and the database record
 */
export async function createApiKey(
  params: CreateApiKeyParams
): Promise<CreateApiKeyResult> {
  const supabase = getSupabaseClient();

  // Generate the API key
  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  const apiKeyPrefix = getApiKeyPrefix(apiKey);

  // Insert into database
  const { data, error } = await supabase
    .from("iris_api_keys")
    .insert({
      project_id: params.projectId,
      project_name: params.projectName,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
      label: params.label,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      throw new Error(
        `API key with label "${params.label}" already exists for this project`
      );
    }
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return {
    apiKey, // Return the raw key (only time it's visible!)
    record: data as ApiKeyRecord,
  };
}

/**
 * Find a project by API key hash
 * Used during authentication
 *
 * @param apiKey - Raw API key from request header
 * @returns Project info if key is valid and active, null otherwise
 */
export async function findProjectByApiKey(
  apiKey: string
): Promise<{ projectId: string; projectName: string; keyId: string } | null> {
  const supabase = getSupabaseClient();
  const apiKeyHash = hashApiKey(apiKey);

  const { data, error } = await supabase
    .from("iris_api_keys")
    .select("id, project_id, project_name, is_active")
    .eq("api_key_hash", apiKeyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    projectId: data.project_id,
    projectName: data.project_name,
    keyId: data.id,
  };
}

/**
 * Update last_used_at and increment usage_count for an API key
 * Called after successful authentication
 */
export async function touchApiKeyUsage(keyId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Use RPC to increment usage count atomically
  const { error } = await supabase.rpc("increment_usage_count", {
    key_id: keyId,
  });

  // Update last_used_at separately
  if (!error) {
    await supabase
      .from("iris_api_keys")
      .update({
        last_used_at: new Date().toISOString(),
      })
      .eq("id", keyId);
  }

  // Silently fail usage tracking to not block requests
  if (error) {
    console.warn("Failed to update API key usage:", error.message);
  }
}

/**
 * List all API keys for a project
 */
export async function listApiKeys(projectId: string): Promise<ApiKeyRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("iris_api_keys")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  return (data || []) as ApiKeyRecord[];
}

/**
 * Revoke an API key (soft delete - sets is_active = false)
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("iris_api_keys")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", keyId);

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`);
  }
}

/**
 * Delete an API key permanently
 * Use with caution - prefer revokeApiKey for soft delete
 */
export async function deleteApiKey(keyId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("iris_api_keys")
    .delete()
    .eq("id", keyId);

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
}

/**
 * Rotate an API key - creates a new one and revokes the old one
 *
 * @param keyId - ID of the key to rotate
 * @returns New API key (only shown once!)
 */
export async function rotateApiKey(keyId: string): Promise<CreateApiKeyResult> {
  const supabase = getSupabaseClient();

  // Get the old key record
  const { data: oldKey, error: fetchError } = await supabase
    .from("iris_api_keys")
    .select("*")
    .eq("id", keyId)
    .single();

  if (fetchError || !oldKey) {
    throw new Error("API key not found");
  }

  // Create a new key with same project and label
  const newKeyResult = await createApiKey({
    projectId: oldKey.project_id,
    projectName: oldKey.project_name,
    label: `${oldKey.label} (rotated)`,
  });

  // Revoke the old key
  await revokeApiKey(keyId);

  return newKeyResult;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return (
    apiKey.startsWith(API_KEY_PREFIX) &&
    apiKey.length > API_KEY_PREFIX.length + 20
  );
}
