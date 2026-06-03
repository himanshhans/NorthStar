// @ts-nocheck — Deno runtime (Supabase Edge Function); not type-checked by the app's TS server.
// Supabase Edge Function: morning-chat
// A warm "morning check-in with a friend". Given the user's goals + yesterday's
// reflection + the conversation so far, returns a short friendly reply AND
// suggested focus tasks for today (tied to goals). JSON, via OpenRouter.
//
// Deploy:  npx supabase functions deploy morning-chat --no-verify-jwt
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

    const { name, today, goals = [], yesterday, messages = [] } = await req.json();

    const goalLines = goals.length
      ? goals.map((g: any) => `- ${g.title} (${g.category})`).join("\n")
      : "(no active goals yet)";

    const y = yesterday
      ? `Went well: ${yesterday.went_well || "—"}\nDidn't go well: ${yesterday.didnt_go || "—"}\nWanted to improve: ${yesterday.tomorrow || "—"}\nNotes: ${yesterday.free || "—"}`
      : "(no reflection yesterday)";

    const transcript = messages.length
      ? messages.map((m: any) => `${m.role === "user" ? "Them" : "You"}: ${m.content}`).join("\n")
      : "(conversation just starting — greet them warmly)";

    const system =
      `You are NorthStar, but right now you're talking like a warm, encouraging friend doing a ` +
      `morning check-in. Casual, brief, second person. No corporate or coachy tone. 1-3 short ` +
      `sentences max. Use their name occasionally. Reference real context naturally (don't dump it). ` +
      `NEVER assume the user's tools, programming language, framework, or skill level if they ` +
      `haven't told you — ask a quick clarifying question instead of guessing.`;

    const prompt =
      `Friend's name: ${name || "there"}\n` +
      `Today: ${today}\n\n` +
      `Their active goals:\n${goalLines}\n\n` +
      `Yesterday's reflection:\n${y}\n\n` +
      `Conversation so far:\n${transcript}\n\n` +
      `Respond as the friend. If it's the opener, greet warmly (maybe a light nod to yesterday) and ` +
      `propose 1-3 concrete focus tasks for today tied to their goals. As they reply, REVISE the tasks ` +
      `to match what they actually said (e.g. if they correct the language or scope, rewrite the tasks).\n\n` +
      `Return ONLY JSON:\n` +
      `{"reply": string (your short friendly message), "tasks": [{"text": string, "goal": (matching goal title or null)}]}\n` +
      `IMPORTANT: always include your CURRENT best 1-3 tasks in "tasks" every turn — re-send the full ` +
      `updated list, never drop it once you've proposed any. Use [] only before any concrete focus exists ` +
      `(e.g. you're still asking a clarifying question and have nothing yet).`;

    const parsed = parseJsonLoose(await callLLM({ system, prompt, json: true, temperature: 0.85 }));

    return json(
      {
        reply: String(parsed.reply ?? "Morning! What would make today a good one?"),
        tasks: (parsed.tasks ?? []).slice(0, 3).map((t: any) => ({
          text: String(t.text ?? ""),
          goal: t.goal ? String(t.goal) : null,
        })).filter((t: any) => t.text),
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
