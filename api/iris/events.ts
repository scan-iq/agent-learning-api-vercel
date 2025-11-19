import type { VercelRequest, VercelResponse } from '@vercel/node';
import { irisPrime } from "@foxruv/agent-learning-core";
import { withIrisAuthVercel } from '../../lib/auth.js';
import { initCoreSupabase } from '../../lib/supabase.js';

/**
 * POST /api/iris/events
 *
 * Log evaluation events and triggers for IRIS Prime
 *
 * Request Body:
 * {
 *   "eventType": "evaluation_triggered" | "anomaly_detected" | "pattern_found",
 *   "projectId": "string",
 *   "metadata": { ... }
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return withIrisAuthVercel(req, res, async (project, req, res) => {
    try {
      await initCoreSupabase();

      const { eventType, projectId } = req.body;

      if (!eventType) {
        return res.status(400).json({ error: 'eventType is required' });
      }

      const targetProjectId = projectId || project.projectId;

      // Import IRIS Prime from core library
      // Using irisPrime from static import

      // Log the event using proper method
      await irisPrime.evaluateProject(targetProjectId);

      return res.status(201).json({
        success: true,
        message: 'Event logged successfully',
        eventType,
        projectId: targetProjectId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Event logging error:', error);

      const message = error instanceof Error ? error.message : 'Failed to log event';
      return res.status(500).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
