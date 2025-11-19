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
/**
 * Initialize Supabase for agent-learning-core
 */
export async function initCoreSupabase() {
    try {
        const { initSupabaseFromEnv } = await import('@foxruv/agent-learning-core');
        // Set environment variables if not already set
        if (!process.env.SUPABASE_URL) {
            throw new Error('SUPABASE_URL environment variable is required');
        }
        await initSupabaseFromEnv();
    }
    catch (error) {
        // agent-learning-core is optional, fallback to basic client
        console.warn('agent-learning-core not available, using basic Supabase client');
    }
    return getSupabaseClient();
}
