import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * PUBLIC WEBHOOK: POST /api/webhook/iris-telemetry
 *
 * Simple public endpoint for IRIS telemetry collection
 * No authentication - trusts projectId in payload
 *
 * This is IRIS's central collection point for ALL projects
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, expertId, confidence, latencyMs, outcome, ...rest } = req.body;

    // Basic validation
    if (!projectId || !expertId) {
      return res.status(400).json({
        error: 'projectId and expertId required'
      });
    }

    // Initialize Supabase with IRIS's credentials (backend has them)
    const supabaseUrl = process.env.FOXRUV_SUPABASE_URL?.trim();
    const supabaseKey = process.env.FOXRUV_SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured - telemetry lost');
      return res.status(503).json({
        error: 'Backend not configured',
        logged: false
      });
    }

    // Use lib/supabase helper instead
    const { getSupabaseClient } = await import('../../lib/supabase.js');
    const supabase = getSupabaseClient();

    // Store telemetry directly to IRIS's Supabase
    const { error } = await supabase.from('model_run_log').insert({
      tenant_id: 'foxruv',
      project: projectId,
      expert_id: expertId,
      confidence,
      latency_ms: latencyMs,
      outcome,
      timestamp: new Date().toISOString(),
      ...rest
    });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    return res.status(201).json({
      success: true,
      logged: true,
      projectId,
      expertId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('IRIS telemetry error:', error);

    // Return success even on error (non-blocking for projects)
    return res.status(200).json({
      success: false,
      logged: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
