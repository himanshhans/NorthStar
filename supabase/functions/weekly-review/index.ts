// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: weekly-review
// Takes a pre-aggregated week snapshot (built client-side) and returns a
// structured deep-dive: summary, insights, and 3 concrete adjustments.
//
// Deploy:  npx supabase functions deploy weekly-review --no-verify-jwt

const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const snap = await req.json();

    const prompt =
      `You are NorthStar — coach, analyst, and mentor. Write a weekly deep-dive review ` +
      `from this snapshot. Be honest and specific; use the real numbers. Warm but direct.\n\n` +
      `WEEK SNAPSHOT (JSON):\n${JSON.stringify(snap, null, 2)}\n\n` +
      `Return:\n` +
      `- summary: 2-3 sentences on how the week actually went (progress, consistency).\n` +
      `- insights: 2-3 sentences naming ONE real pattern (good or bad) tied to their goals/habits.\n` +
      `- adjustments: exactly 3 concrete, small changes for next week. Each one actionable, ` +
      `no vague advice. Reference their actual goals/habits where possible.`;

    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              insights: { type: "string" },
              adjustments: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "insights", "adjustments"],
          },
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text);

    return json(
      {
        summary: String(parsed.summary ?? ""),
        insights: String(parsed.insights ?? ""),
        adjustments: (parsed.adjustments ?? []).slice(0, 3).map(String),
      },
      200,
    );
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
