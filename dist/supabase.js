import { createClient } from '@supabase/supabase-js';
let supabaseClient = null;
/**
 * Get or create Supabase client singleton
 */
export function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY required');
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    return supabaseClient;
}
