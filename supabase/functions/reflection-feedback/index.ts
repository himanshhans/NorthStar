// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: reflection-feedback
// Evening reflection -> short, honest coaching (plain text), via OpenRouter.
//
// Deploy:  npx supabase functions deploy reflection-feedback --no-verify-jwt
import { getUserId } from "../_shared/auth.ts";
import { callLLM } from "../_shared/llm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReflectionInput {
  went_well?: string;
  didnt_go?: string;
  tomorrow?: string;
  free?: string;
  goals?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const r = (await req.json()) as ReflectionInput;
    const today = new Date().toISOString().slice(0, 10);

    const prompt =
      `You are NorthStar — coach, analyst, and mentor at once. Tone: warm but honest, never gushing. ` +
      `If something slipped, name it kindly and constructively.\n\n` +
      `Date: ${today}\n` +
      `Active goals: ${r.goals?.length ? r.goals.join("; ") : "(none listed)"}\n\n` +
      `Reflection:\n` +
      `- Went well: ${r.went_well || "(blank)"}\n` +
      `- Didn't go as planned: ${r.didnt_go || "(blank)"}\n` +
      `- Wants to improve tomorrow: ${r.tomorrow || "(blank)"}\n` +
      `- Free notes: ${r.free || "(blank)"}\n\n` +
      `Write 3-5 sentences directly to the user (second person). Acknowledge what's real, surface ONE ` +
      `pattern tied to their goals, give ONE concrete small action for tomorrow. No lists, no headers, ` +
      `no preamble — just the coaching.`;

    const feedback =
      (await callLLM({ prompt, temperature: 0.7 })).trim() ||
      "Thanks for checking in. Rest well — tomorrow's a fresh page.";

    return json({ feedback }, 200);
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
