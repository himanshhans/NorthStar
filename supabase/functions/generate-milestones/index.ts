// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: generate-milestones
// 2-step agent:
//   1) RESEARCH — Gemini with Google Search grounding looks up real facts
//      (a book's page/chapter count, a realistic skill syllabus, etc.)
//   2) PLAN     — Gemini turns goal + research into a dynamic-length, structured
//      milestone list (JSON). Count is decided by the model to fit scope + timeframe.
//
// The Gemini key lives only here (Supabase secret) — never in the browser.
// Deploy:  npx supabase functions deploy generate-milestones --no-verify-jwt
// Secret:  npx supabase secrets set GEMINI_API_KEY=...   (key starts AIza)
//          npx supabase secrets set GEMINI_MODEL=gemini-2.5-pro   (optional)

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GoalInput {
  title: string;
  category?: string;
  description?: string;
  target_date?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const goal = (await req.json()) as GoalInput;
    if (!goal?.title) return json({ error: "Missing goal.title" }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const goalBlock =
      `Goal title: ${goal.title}\n` +
      `Category: ${goal.category ?? "unspecified"}\n` +
      `Description: ${goal.description ?? "(none)"}\n` +
      `Today: ${today}\n` +
      `Target date: ${goal.target_date ?? "(none given)"}`;

    // ---------- Step 1: RESEARCH (web-grounded) ----------
    const researchPrompt =
      `You are a research assistant planning a personal goal. Use web search to gather ` +
      `ONLY the concrete facts needed to build a realistic plan. Be specific with numbers.\n\n` +
      `${goalBlock}\n\n` +
      `Find things like: if it names a book -> its real page count, chapter count, and rough ` +
      `time to read. If it's a skill (e.g. "learn DSA") -> the standard topics/curriculum and a ` +
      `realistic learning sequence. If it has a numeric target -> sensible weekly pace. ` +
      `Reply in 4-8 short bullet points of facts only. No plan yet.`;

    let research = "";
    try {
      const r = await callGemini(apiKey, GEMINI_MODEL, {
        contents: [{ parts: [{ text: researchPrompt }] }],
        tools: [{ google_search: {} }],
      });
      research = extractText(r) || "(no research findings)";
    } catch (_e) {
      research = "(research step unavailable — plan from general knowledge)";
    }

    // ---------- Step 2: PLAN (structured JSON, dynamic length) ----------
    const planPrompt =
      `You are NorthStar, a sharp, no-nonsense personal growth coach.\n` +
      `Build a milestone roadmap for this goal using the research facts below.\n\n` +
      `${goalBlock}\n\n` +
      `RESEARCH FINDINGS:\n${research}\n\n` +
      `RULES — follow strictly:\n` +
      `1. YOU decide how many milestones the goal genuinely needs — no fixed number. ` +
      `A short book might be 3-4; "learn DSA in 6 months" might be 8-14. Scale to real scope ` +
      `AND the timeframe. Never pad; never cram.\n` +
      `2. HONOR the goal's stated number AND assume ZERO prior progress. Start from the first ` +
      `unit (book 1) — never assume earlier units are already done because of the calendar date. ` +
      `If the goal says 12 books, plan all 12 starting now; the milestones together must reach 12. ` +
      `If time is short, pack more per milestone rather than dropping or skipping units. ` +
      `The cumulative total of the final milestone MUST equal the stated target.\n` +
      `3. GROUP units when there are many — don't make one milestone per unit. For "12 books" use ` +
      `~4-6 milestones each covering 2-3 books ("Finish books 1-3"), not 12 separate ones. ` +
      `For a single book -> split by real chapters/pages. For a skill -> sequence real topics.\n` +
      `4. NO logistics/setup milestones (buy, locate, set up space) and NO planning-the-plan ` +
      `milestones (make a schedule, assess current state). Every milestone = real progress.\n` +
      `5. BAN vague verbs (assess, explore, understand, internalize) and fluff. Plain language. ` +
      `Avoid generic placeholders like "Read Book 1" — say what's actually done and the running total.\n` +
      `6. Pace due_date (YYYY-MM-DD) realistically across today->target date, evenly, in order. ` +
      `The last milestone's due_date lands on/just before the target date and represents the ` +
      `FULL stated goal achieved (all 12 books, the whole target).\n` +
      `7. Title max ~8 words. Description = one sentence: specific action + its metric (incl. running total).`;

    const planResp = await callGemini(apiKey, GEMINI_MODEL, {
      contents: [{ parts: [{ text: planPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            milestones: {
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
          required: ["milestones"],
        },
      },
    });

    const parsed = JSON.parse(extractText(planResp) || "{}");
    const milestones = (parsed.milestones ?? []).map(
      (m: Record<string, unknown>, i: number) => ({
        title: String(m.title ?? `Milestone ${i + 1}`),
        description: String(m.description ?? ""),
        due_date: String(m.due_date ?? ""),
        order_index: i,
      }),
    );

    return json({ milestones }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retries transient 503/429 with backoff; falls back to flash if pro stays overloaded.
async function callGemini(apiKey: string, model: string, body: unknown) {
  const models = model.includes("pro") ? [model, "gemini-2.5-flash"] : [model];
  let lastErr = "";
  for (const m of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${BASE}/${m}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return await res.json();
      const detail = await res.text();
      lastErr = `Gemini ${res.status}: ${detail}`;
      // retry only transient overload/rate errors
      if (res.status === 503 || res.status === 429) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw new Error(lastErr); // non-transient → fail fast
    }
    // exhausted retries on this model → try next (flash)
  }
  throw new Error(lastErr);
}

// Grounded responses can split text across multiple parts — join them all.
function extractText(data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }): string {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
