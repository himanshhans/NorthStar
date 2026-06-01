// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: recovery-replan
// A milestone was missed. Break it into 3-5 smaller, easier steps starting today,
// taking into account what the user says went wrong. Non-judgmental, momentum-first.
//
// Deploy:  npx supabase functions deploy recovery-replan --no-verify-jwt

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

    const inp = await req.json();
    const today = new Date().toISOString().slice(0, 10);

    const prompt =
      `You are NorthStar, a supportive recovery coach. The user missed a milestone. ` +
      `Don't lecture. Break it into 3-5 SMALLER, easier steps so they regain momentum.\n\n` +
      `Goal: ${inp.goalTitle}\n` +
      `Missed milestone: ${inp.milestoneTitle}\n` +
      `Milestone detail: ${inp.milestoneDescription ?? "(none)"}\n` +
      `What the user says happened: ${inp.reason ?? "(not specified)"}\n` +
      `Today: ${today}\n` +
      `Goal target date: ${inp.targetDate ?? "(none)"}\n\n` +
      `RULES:\n` +
      `1. Each step is smaller and more achievable than the original milestone — lower the bar ` +
      `to rebuild momentum. The first step should be tiny (doable today).\n` +
      `2. Address the stated obstacle where relevant.\n` +
      `3. Concrete + measurable. No filler verbs, no setup/planning steps.\n` +
      `4. Spread due_date (YYYY-MM-DD) from today forward, realistically.`;

    const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    due_date: { type: "string" },
                  },
                  required: ["title", "description", "due_date"],
                },
              },
            },
            required: ["steps"],
          },
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
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
