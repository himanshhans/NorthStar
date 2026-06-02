// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: goal-tips
// 4-6 practical tips for achieving a goal (+ a pitfall), JSON, via OpenRouter.
//
// Deploy:  npx supabase functions deploy goal-tips --no-verify-jwt
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

    const goal = await req.json();
    if (!goal?.title) return json({ error: "Missing goal.title" }, 400);

    const prompt =
      `You are NorthStar, an expert coach. Give 4-6 practical, specific tips for ACHIEVING this goal. ` +
      `Mix concrete tactics with one or two common pitfalls to avoid. Return ONLY JSON.\n\n` +
      `Goal: ${goal.title}\n` +
      `Category: ${goal.category ?? "unspecified"}\n` +
      `Description: ${goal.description ?? "(none)"}\n\n` +
      `RULES: specific to THIS goal (no generic "stay motivated"); actionable today; one short sentence ` +
      `each; include at least one "avoid this" pitfall.\n\n` +
      `Return JSON exactly: {"tips": [string, ...]}`;

    const parsed = parseJsonLoose(await callLLM({ prompt, json: true, temperature: 0.7 }));
    const tips = (parsed.tips ?? []).slice(0, 6).map(String).filter(Boolean);

    return json({ tips }, 200);
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
