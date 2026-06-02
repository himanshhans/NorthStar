// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: midday-nudge
// Short (1-2 sentence) practical pep based on the user's mid-day status + remaining focus tasks.
//
// Deploy:  npx supabase functions deploy midday-nudge --no-verify-jwt
import { getUserId } from "../_shared/auth.ts";
import { callLLM } from "../_shared/llm.ts";

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

    const { status, remaining = [], doneCount = 0, totalTasks = 0, blocker } = await req.json();

    const prompt =
      `You are NorthStar, a brief mid-day coach. The user just did a quick check-in. Reply in ` +
      `1-2 sentences, second person — practical and energizing, not preachy. If blocked, suggest one ` +
      `small unblock. If on track, keep it tight and momentum-focused.\n\n` +
      `Status: ${status}\n` +
      `Focus tasks done: ${doneCount}/${totalTasks}\n` +
      `Remaining: ${remaining.length ? remaining.join("; ") : "(none)"}\n` +
      `Blocker: ${blocker || "(none)"}\n\n` +
      `Just the 1-2 sentences, no preamble.`;

    const nudge =
      (await callLLM({ prompt, temperature: 0.8 })).trim() ||
      "Keep going — pick the smallest next step and start it.";

    return json({ nudge }, 200);
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
