import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { initCoreSupabase } from '../../lib/supabase.js';
import { transformEvaluation } from '../../lib/transform.js';

/**
 * GET /api/iris/evaluate
 *
 * Run IRIS Prime evaluation and return dashboard-compatible results
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
      // Initialize Supabase for core library
      await initCoreSupabase();

      // Import IRIS Prime from core library
      const { irisPrime } = await import('@foxruv/agent-learning-core');

      // Get project ID from query or auth context
      const projectId = (req.query.projectId as string) || project.projectId;

      // Run IRIS Prime evaluation
      const evaluation = await irisPrime.evaluateProject(projectId);

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
