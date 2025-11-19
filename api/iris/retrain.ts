import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { initCoreSupabase } from '../../lib/supabase.js';

/**
 * POST /api/iris/retrain
 *
 * Trigger IRIS Prime model retraining
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
      await initCoreSupabase();

      const { projectId } = req.body;
      const targetProjectId = projectId || project.projectId;

      // Import IRIS Prime from core library
      const { irisPrime } = await import('@foxruv/agent-learning-core');

      // Trigger retraining using autoRetrainExperts
      const result = await irisPrime.autoRetrainExperts(targetProjectId);

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
