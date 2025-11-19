/**
 * GET /api/iris/overview
 * Dashboard overview endpoint - provides high-level metrics for all projects
 * Uses auth to get all projects for the authenticated organization
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../lib/auth.js";
import { getSupabaseClient } from "../../lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return withIrisAuthVercel(req, res, async (project, _req, res) => {
    try {
      const supabase = getSupabaseClient();

      // FIXED: Show ALL projects (multi-project overview)
      // Don't filter by authenticated project - show everything for dashboard

      // Fetch data from multiple tables in parallel (NO project filtering)
      const [expertsResult, reportsResult, reflexionsResult, eventsResult] = await Promise.all([
        supabase.from('expert_signatures').select('*').eq('active', true),
        supabase.from('iris_reports').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('reflexion_bank').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('iris_telemetry').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      const experts = expertsResult.data || [];
      const reports = reportsResult.data || [];
      const reflexions = reflexionsResult.data || [];
      const events = eventsResult.data || [];

      // Group by project and calculate metrics
      const projectMap = new Map();
      experts.forEach(expert => {
        if (!projectMap.has(expert.project)) {
          projectMap.set(expert.project, {
            project: expert.project,
            experts: [],
            lastUpdate: expert.updated_at,
          });
        }
        const proj = projectMap.get(expert.project);
        proj.experts.push(expert);
        proj.lastUpdate = expert.updated_at > proj.lastUpdate ? expert.updated_at : proj.lastUpdate;
      });

      // Build projects array
      const projects = Array.from(projectMap.values()).map(p => {
        // Calculate per-project accuracy from expert performance_metrics
        const projectAccuracy = p.experts.reduce((acc: number, e: any) => {
          const metrics = e.performance_metrics || {};
          const accuracy = metrics.accuracy ||
                          metrics.clinical_accuracy ||
                          metrics.win_rate ||
                          metrics.roi ||
                          0;
          return acc + accuracy;
        }, 0) / p.experts.length;

        // Determine health based on accuracy
        let health: 'healthy' | 'warning' | 'critical';
        if (projectAccuracy >= 0.8) health = 'healthy';
        else if (projectAccuracy >= 0.6) health = 'warning';
        else health = 'critical';

        const projectReports = reports.filter(r => r.project === p.project);
        const projectReflexions = reflexions.filter(r => r.project === p.project);

        return {
          project: p.project,
          overallHealth: health,
          latestHealthScore: projectAccuracy,
          lastReportDate: p.lastUpdate,
          totalRuns: projectReports.length,
          avgSuccessRate: projectAccuracy,
          activeExperts: p.experts.length,
          totalReflexions: projectReflexions.length,
        };
      });

      const totalExperts = experts.length;
      const healthyCount = projects.filter(p => p.overallHealth === 'healthy').length;
      const warningCount = projects.filter(p => p.overallHealth === 'warning').length;
      const criticalCount = projects.filter(p => p.overallHealth === 'critical').length;

      // Calculate global average accuracy
      const globalAvgAccuracy = experts.reduce((acc, e) => {
        const metrics = e.performance_metrics || {};
        const accuracy = metrics.accuracy ||
                        metrics.clinical_accuracy ||
                        metrics.win_rate ||
                        metrics.roi ||
                        0;
        return acc + accuracy;
      }, 0) / (totalExperts || 1);

      // Get today's date for filtering runs
      const today = new Date().toISOString().split('T')[0];

      // Transform events to match expected format
      const formattedEvents = events.slice(0, 50).map(event => ({
        id: event.id,
        timestamp: event.created_at,
        project: event.project_id,
        event_type: event.event_type || 'info',
        severity: event.severity || 'info',
        message: event.message || event.event_data?.message || '',
        details: event.event_data || {},
      }));

      return res.status(200).json({
        metrics: {
          total_projects: projects.length,
          healthy_projects: healthyCount,
          warning_projects: warningCount,
          critical_projects: criticalCount,
          total_runs_today: reports.filter(r => r.created_at?.startsWith(today)).length,
          avg_success_rate: globalAvgAccuracy,
          active_experts: totalExperts,
          total_reflexions: reflexions.length,
        },
        projects,
        events: formattedEvents,
        anomalies: [], // TODO: Query anomalies table when available
      });
    } catch (error) {
      console.error('Error in /api/iris/overview:', error);
      return res.status(500).json({
        error: 'Failed to fetch overview data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
