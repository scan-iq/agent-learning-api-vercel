import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { getSupabaseClient } from '../../lib/supabase.js';

/**
 * POST /api/iris/retrain
 *
 * Trigger IRIS model retraining
 *
 * Request Body:
 * {
 *   "projectId": "string" (optional),
 *   "trainingData": { ... } (optional),
 *   "options": {
 *     "epochs": number,
 *     "learningRate": number
 *   }
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      const supabase = getSupabaseClient();
      const targetProjectId = project.projectId;

      // Log retraining event
      const { error } = await supabase
        .from('iris_telemetry')
        .insert({
          project_id: targetProjectId,
          event_type: 'retrain_initiated',
          metadata: req.body || {},
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(`Failed to log retrain event: ${error.message}`);
      }

      // Return success response with retraining status
      const result = {
        status: 'initiated',
        projectId: targetProjectId,
        initiatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        message: 'Retraining initiated successfully',
        result,
        projectId: targetProjectId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Retraining error:', error);

      const message = error instanceof Error ? error.message : 'Retraining failed';
      return res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
