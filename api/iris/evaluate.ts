import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { getSupabaseClient } from '../../lib/supabase.js';
import { transformEvaluation } from '../../lib/transform.js';

/**
 * GET /api/iris/evaluate
 *
 * Run IRIS evaluation and return dashboard-compatible results
 *
 * Query Parameters:
 * - projectId: Project identifier (optional, uses auth context if not provided)
 *
 * Headers:
 * - Authorization: Bearer <api-key>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      // Get Supabase client
      const supabase = getSupabaseClient();

      // Get project ID from query or auth context
      const projectId = (req.query.projectId as string) || project.projectId;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Query iris_telemetry table for recent evaluation data
      const { data, error } = await supabase
        .from('iris_telemetry')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Compute evaluation from telemetry data
      const evaluation = {
        projectId,
        totalEvents: data?.length || 0,
        avgConfidence: data && data.length > 0
          ? data.reduce((sum: number, t: any) => sum + (t.confidence || 0), 0) / data.length
          : 0,
        timestamp: new Date().toISOString(),
      };

      // Transform to dashboard format
      const dashboardData = transformEvaluation(evaluation, projectId);

      // Return successful response
      return res.status(200).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Evaluation error:', error);

      const message = error instanceof Error ? error.message : 'Failed to run evaluation';
      return res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
