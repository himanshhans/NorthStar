// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: recovery-replan
// Missed milestone -> 3-5 smaller, easier steps (JSON) via OpenRouter.
//
// Deploy:  npx supabase functions deploy recovery-replan --no-verify-jwt
import { getUserId } from "../_shared/auth.ts";
import { callLLM, parseJsonLoose } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const inp = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    const prompt =
      `You are NorthStar, a supportive recovery coach. The user missed a milestone. Don't lecture. ` +
      `Break it into 3-5 SMALLER, easier steps to regain momentum. Return ONLY JSON.\n\n` +
      `Goal: ${inp.goalTitle}\n` +
      `Missed milestone: ${inp.milestoneTitle}\n` +
      `Detail: ${inp.milestoneDescription ?? "(none)"}\n` +
      `What happened: ${inp.reason ?? "(not specified)"}\n` +
      `Today: ${today}\n` +
      `Goal target date: ${inp.targetDate ?? "(none)"}\n\n` +
      `RULES: each step smaller than the original; the first is tiny (doable today); address the ` +
      `obstacle; concrete + measurable; no filler/setup steps; spread due_date (YYYY-MM-DD) from today.\n\n` +
      `Return JSON exactly: {"steps":[{"title":string,"description":string,"due_date":"YYYY-MM-DD"}]}`;

    const parsed = parseJsonLoose(await callLLM({ prompt, json: true, temperature: 0.6 }));
    const steps = (parsed.steps ?? []).slice(0, 5).map((s: Record<string, unknown>) => ({
      title: String(s.title ?? ""),
      description: String(s.description ?? ""),
      due_date: String(s.due_date ?? ""),
    }));

    return json({ steps }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
