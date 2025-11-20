import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withIrisAuthVercel } from "../../lib/auth.js";
import { getSupabaseClient } from "../../lib/supabase.js";
import { DecisionDraftStatusSchema } from "../../lib/schemas.js";
import type { DecisionDraftRow } from "../../lib/types.supabase.js";

/**
 * GET: list draft decisions (optional ?status=pending|approved|rejected)
 * POST: update status of a draft decision
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseClient();

  if (req.method === "GET") {
    return withIrisAuthVercel(req, res, async (_project, _req, res) => {
      const status = req.query.status as DecisionDraftRow["status"] | undefined;

      let query = supabase
        .from<DecisionDraftRow>("decision_drafts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: "Failed to fetch decisions", details: error.message });
      }

      return res.status(200).json({ decisions: data || [] });
    });
  }

  if (req.method === "POST") {
    return withIrisAuthVercel(req, res, async (_project, _req, res) => {
      const parsed = DecisionDraftStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", issues: parsed.error.flatten() });
      }
      const { id, status } = parsed.data;

      const { data, error } = await supabase
        .from<DecisionDraftRow>("decision_drafts")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: "Failed to update decision", details: error.message });
      }

      return res.status(200).json({ decision: data });
    });
  }

  return res.status(405).json({ error: "Method not allowed", allowedMethods: ["GET", "POST"] });
}
