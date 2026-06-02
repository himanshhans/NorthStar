// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: generate-milestones
// Turns a goal + the user's time commitment into a feasibility verdict AND a
// realistic, buffered milestone roadmap (JSON) via OpenRouter.
//
// Deploy:  npx supabase functions deploy generate-milestones --no-verify-jwt
import { getUserId } from "../_shared/auth.ts";
import { callLLM, parseJsonLoose } from "../_shared/llm.ts";

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
  hoursPerDay?: number;
  daysPerWeek?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const goal = (await req.json()) as GoalInput;
    if (!goal?.title) return json({ error: "Missing goal.title" }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const hoursPerDay = Number(goal.hoursPerDay) || null;
    const daysPerWeek = Number(goal.daysPerWeek) || null;

    // Rough available-time budget (the model refines the judgment).
    let budgetLine = "Time commitment: not specified — assume a moderate, sustainable pace.";
    if (hoursPerDay && daysPerWeek && goal.target_date) {
      const days = Math.max(0, Math.round((+new Date(goal.target_date) - +new Date(today)) / 86400000));
      const weeks = (days / 7).toFixed(1);
      const totalHours = Math.round(hoursPerDay * daysPerWeek * (days / 7));
      budgetLine =
        `Time commitment: ${hoursPerDay} h/day × ${daysPerWeek} day/week. ` +
        `Horizon: ~${weeks} weeks (${days} days) to target. ` +
        `Rough available study time: ~${totalHours} hours BEFORE buffer.`;
    } else if (hoursPerDay && daysPerWeek) {
      budgetLine = `Time commitment: ${hoursPerDay} h/day × ${daysPerWeek} day/week (no target date — propose a realistic horizon).`;
    }

    const prompt =
      `You are NorthStar, a sharp, realistic personal growth coach. Given a goal and the user's ` +
      `real time budget, FIRST judge feasibility, THEN build the most logical achievable roadmap. ` +
      `Return ONLY JSON.\n\n` +
      `Goal title: ${goal.title}\n` +
      `Category: ${goal.category ?? "unspecified"}\n` +
      `Description: ${goal.description ?? "(none)"}\n` +
      `Today: ${today}\n` +
      `Target date: ${goal.target_date ?? "(none — propose a realistic finish)"}\n` +
      `${budgetLine}\n\n` +
      `RULES — follow strictly:\n` +
      `1. FEASIBILITY: estimate the real effort this goal needs (hours), compare to the available ` +
      `time MINUS a ~15-20% buffer. Verdict = "achievable", "tight", or "unrealistic".\n` +
      `   - achievable: comfortably fits. Plan normally.\n` +
      `   - tight: fits only with discipline. Plan lean, note the risk.\n` +
      `   - unrealistic: cannot fit. Either (a) plan the BEST reduced-scope version that DOES fit ` +
      `the time and say what you trimmed, or (b) keep full scope but state the realistic finish ` +
      `date it actually needs. Pick whichever serves the user; explain in the note.\n` +
      `2. PACE to the committed days only (e.g. ${daysPerWeek ?? "the stated"} days/week) — never ` +
      `assume 7 days. Leave buffer/catch-up slack so a missed day doesn't break the plan. Do NOT ` +
      `pack the schedule to the last day; finish on or comfortably before the target.\n` +
      `3. Size each milestone to the weekly time budget (hours/week). Heavier weeks only if the ` +
      `budget allows. Don't front-load impossibly.\n` +
      `4. YOU decide the milestone count — scale to scope AND time. Honor any stated number in the ` +
      `goal; assume ZERO prior progress; group many units sensibly ("Finish books 1-3").\n` +
      `5. NO logistics/setup or planning-the-plan milestones. BAN vague verbs and fluff. Each ` +
      `milestone = concrete, measurable progress with a metric.\n` +
      `6. due_date (YYYY-MM-DD) in order, paced across today->target realistically.\n\n` +
      `Return JSON exactly:\n` +
      `{"feasibility": {"verdict": "achievable|tight|unrealistic", "note": string (1-2 sentences, ` +
      `mention buffer + realistic finish if relevant)},\n` +
      ` "milestones": [{"title": string, "description": string, "due_date": "YYYY-MM-DD"}]}`;

    const parsed = parseJsonLoose(await callLLM({ prompt, json: true, temperature: 0.6 }));

    const milestones = (parsed.milestones ?? []).map(
      (m: Record<string, unknown>, i: number) => ({
        title: String(m.title ?? `Milestone ${i + 1}`),
        description: String(m.description ?? ""),
        due_date: String(m.due_date ?? ""),
        order_index: i,
      }),
    );

    const feasibility = parsed.feasibility
      ? {
          verdict: String(parsed.feasibility.verdict ?? "achievable"),
          note: String(parsed.feasibility.note ?? ""),
        }
      : null;

    return json({ milestones, feasibility }, 200);
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
