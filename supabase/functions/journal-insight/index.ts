// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: journal-insight
// Reads a free-form journal entry and returns a short, warm reflection that
// names the mood/pattern and offers one gentle perspective. Plain text.
//
// Deploy:  npx supabase functions deploy journal-insight --no-verify-jwt

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

    const { content, mood } = await req.json();
    if (!content) return json({ error: "Missing content" }, 400);

    const prompt =
      `You are NorthStar, a thoughtful journaling companion (mentor + analyst). ` +
      `Read this journal entry and respond in 3-4 sentences, second person. ` +
      `Reflect back the core feeling you notice, name ONE pattern or reframe gently, ` +
      `and end with a small grounding thought or question. Warm, never clinical, no lists.\n\n` +
      `Self-rated mood: ${mood || "(not given)"}\n` +
      `Entry:\n${content}`;

    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const reflection =
      (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p.text ?? "")
        .join("").trim() || "Thanks for writing this down. Naming it is the first step.";

    return json({ reflection }, 200);
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
