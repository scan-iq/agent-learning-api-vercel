import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { getSupabaseClient } from '../../lib/supabase.js';
import { transformEvaluation } from '../../lib/transform.js';

/**
 * GET /api/iris/:projectId
 *
 * Get evaluation results for a specific project
 *
 * Path Parameters:
 * - projectId: Project identifier
 *
 * Query Parameters:
 * - fromDate: Start date for historical data (ISO 8601)
 * - toDate: End date for historical data (ISO 8601)
 * - limit: Maximum number of results (default: 100)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      const supabase = getSupabaseClient();

      // Extract project ID from URL path or use authenticated project
      const projectId = (req.query.projectId as string) || project.projectId;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Parse query parameters
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const limit = parseInt(req.query.limit as string) || 100;

      // Query iris_telemetry table for project data
      let query = supabase
        .from('iris_telemetry')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }

      if (toDate) {
        query = query.lte('created_at', toDate);
      }

      const { data, error } = await query;

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

      // Transform historical data
      const dashboardData = transformEvaluation(evaluation, projectId);

      return res.status(200).json({
        success: true,
        data: dashboardData,
        historical: true,
        count: data?.length || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Project evaluation error:', error);

      const message = error instanceof Error ? error.message : 'Failed to retrieve project evaluation';
      return res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
