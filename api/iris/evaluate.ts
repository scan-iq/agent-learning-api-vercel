import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';
import { initCoreSupabase } from '../../lib/supabase.js';
import { transformEvaluation } from '../../lib/transform.js';
import { errorToResponse } from '../../lib/errors.js';

/**
 * GET /api/iris/evaluate
 *
 * Run IRIS Prime evaluation and return dashboard-compatible results
 *
 * Query Parameters:
 * - projectId: Project identifier (optional, uses auth context if not provided)
 *
 * Headers:
 * - Authorization: Bearer <api-key> OR
 * - X-API-Key: <api-key>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate request
    const authenticatedProjectId = await requireAuth(req as any);
    
    // Initialize Supabase for core library
    await initCoreSupabase();

    // Import IRIS Prime from core library
    const { irisPrime } = await import('@foxruv/agent-learning-core');

    // Get project ID from query or auth context
    const projectId = (req.query.projectId as string) || authenticatedProjectId;

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
    
    const errorRes = errorToResponse(error, '/api/iris/evaluate');
    const errorJson = await errorRes.json();
    
    return res.status(errorRes.status).json(errorJson);
  }
}
