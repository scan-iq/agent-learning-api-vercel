import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth.js';
import { initCoreSupabase, getSupabaseClient } from '../../lib/supabase.js';
import { transformAnomalies } from '../../lib/transform.js';
import { errorToResponse } from '../../lib/errors.js';

/**
 * GET /api/iris/anomalies
 *
 * Retrieve detected anomalies
 *
 * Query Parameters:
 * - projectId: Project identifier (optional)
 * - severity: Filter by severity (low, medium, high, critical)
 * - fromDate: Start date (ISO 8601)
 * - toDate: End date (ISO 8601)
 * - limit: Maximum results (default: 50)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate request
    const authenticatedProjectId = await requireAuth(req as any);
    
    await initCoreSupabase();
    const supabase = getSupabaseClient();

    const projectId = (req.query.projectId as string) || authenticatedProjectId;
    const severity = req.query.severity as string | undefined;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    // Query iris_reports for anomalies
    let query = supabase
      .from('iris_reports')
      .select('*')
      .eq('project_id', projectId)
      .not('anomalies', 'is', null)
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
      throw new Error(`Failed to retrieve anomalies: ${error.message}`);
    }

    // Extract and transform anomalies
    const allAnomalies = (data || [])
      .flatMap(report => report.anomalies || [])
      .map((anomaly, index) => ({
        ...anomaly,
        id: anomaly.id || `anomaly-${index}`,
      }));

    const transformed = transformAnomalies(allAnomalies);

    // Filter by severity if specified
    const filtered = severity
      ? transformed.filter(a => a.severity === severity)
      : transformed;

    return res.status(200).json({
      success: true,
      data: filtered,
      count: filtered.length,
      projectId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Anomalies retrieval error:', error);
    
    const errorResponse = errorToResponse(error, '/api/iris/anomalies');
    const responseJson = await errorResponse.json();
    
    return res.status(errorResponse.status).json(responseJson);
  }
}
