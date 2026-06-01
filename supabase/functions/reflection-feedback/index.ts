// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: reflection-feedback
// Takes an evening reflection + the user's active goals, returns short, honest coaching.
// Plain-text response (no JSON). Gemini key stays server-side.
//
// Deploy:  npx supabase functions deploy reflection-feedback --no-verify-jwt
// Model:   reuses GEMINI_MODEL secret; defaults to flash (feedback is cheap).

const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
  goals?: string[]; // active goal titles for context
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const r = (await req.json()) as ReflectionInput;
    const today = new Date().toISOString().slice(0, 10);

    const prompt =
      `You are NorthStar — a personal coach who is Coach (motivating), Analyst (spots patterns), ` +
      `and Mentor (gives perspective), all at once. Tone: warm but honest. Never gush, never ` +
      `flatter. If something slipped, name it kindly and constructively.\n\n` +
      `Date: ${today}\n` +
      `User's active goals: ${(r.goals?.length ? r.goals.join("; ") : "(none listed)")}\n\n` +
      `Tonight's reflection:\n` +
      `- Went well: ${r.went_well || "(blank)"}\n` +
      `- Didn't go as planned: ${r.didnt_go || "(blank)"}\n` +
      `- Wants to improve tomorrow: ${r.tomorrow || "(blank)"}\n` +
      `- Free notes: ${r.free || "(blank)"}\n\n` +
      `Write 3-5 sentences directly to the user (second person). Acknowledge what's real, ` +
      `surface ONE pattern or insight tied to their goals, and give ONE concrete, small action ` +
      `for tomorrow. No bullet lists, no headers, no preamble — just the coaching, plainly.`;

    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini ${res.status}: ${detail}`);
    }

    const data = await res.json();
    const feedback =
      (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("")
        .trim() || "Thanks for checking in. Rest well — tomorrow's a fresh page.";

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
