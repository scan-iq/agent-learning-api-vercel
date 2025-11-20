import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseClient } from "../../lib/supabase.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseClient();
  try {
    // lightweight ping
    const { error } = await supabase.from("model_run_log").select("id", { count: "exact", head: true }).limit(1);
    if (error) {
      return res.status(503).json({ ok: false, error: error.message });
    }
    return res.status(200).json({ ok: true, message: "telemetry online" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}
