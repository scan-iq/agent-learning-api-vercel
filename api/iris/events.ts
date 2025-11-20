import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withIrisAuthVercel } from '../../lib/auth.js';
import { getSupabaseClient } from '../../lib/supabase.js';

/**
 * POST /api/iris/events
 *
 * Log evaluation events and triggers for IRIS
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
      const supabase = getSupabaseClient();

      const { eventType, metadata } = req.body;

      if (!eventType) {
        return res.status(400).json({ error: 'eventType is required' });
      }

      const targetProjectId = project.projectId;

      // Insert event into iris_telemetry table
      const { error } = await supabase
        .from('iris_telemetry')
        .insert({
          project_id: targetProjectId,
          event_type: eventType,
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(`Failed to log event: ${error.message}`);
      }

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
