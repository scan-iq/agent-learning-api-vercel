import { SupabaseClient } from '@supabase/supabase-js';
/**
 * Get or create Supabase client singleton
 */
export declare function getSupabaseClient(): SupabaseClient;
/**
 * Initialize Supabase for agent-learning-core
 */
export declare function initCoreSupabase(): Promise<SupabaseClient<any, "public", "public", any, any>>;
//# sourceMappingURL=supabase.d.ts.map