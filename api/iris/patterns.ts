import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { initCoreSupabase, getSupabaseClient } from '../../lib/supabase.js';
import { transformPatterns } from '../../lib/transform.js';

/**
 * GET /api/iris/patterns
 *
 * Retrieve discovered patterns
 *
 * Query Parameters:
 * - projectId: Project identifier (optional)
 * - category: Filter by category
 * - minConfidence: Minimum confidence threshold (0-1)
 * - fromDate: Start date (ISO 8601)
 * - toDate: End date (ISO 8601)
 * - limit: Maximum results (default: 50)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      await initCoreSupabase();
      const supabase = getSupabaseClient();

      const projectId = (req.query.projectId as string) || project.projectId;
      const category = req.query.category as string | undefined;
      const minConfidence = req.query.minConfidence
        ? parseFloat(req.query.minConfidence as string)
        : undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      // Query discovered_patterns table
      let query = supabase
        .from('discovered_patterns')
        .select('*')
        .eq('project_id', projectId)
        .order('discovered_at', { ascending: false })
        .limit(limit);

      if (category) {
        query = query.eq('category', category);
      }

      if (minConfidence !== undefined) {
        query = query.gte('confidence', minConfidence);
      }

      if (fromDate) {
        query = query.gte('discovered_at', fromDate);
      }

      if (toDate) {
        query = query.lte('discovered_at', toDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to retrieve patterns: ${error.message}`);
      }

      // Transform to dashboard format
      const transformed = transformPatterns(data || []);

      return res.status(200).json({
        success: true,
        data: transformed,
        count: transformed.length,
        projectId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Patterns retrieval error:', error);

      const message = error instanceof Error ? error.message : 'Failed to retrieve patterns';
      return res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
