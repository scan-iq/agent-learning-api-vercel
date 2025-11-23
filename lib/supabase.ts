import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client singleton
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Support both standard and FOXRUV-prefixed env vars
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.FOXRUV_SUPABASE_URL?.trim();

  const supabaseKey =
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.FOXRUV_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.FOXRUV_SUPABASE_ANON_KEY)?.trim();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or FOXRUV_* equivalents)'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}
