// @ts-nocheck — Deno runtime.
// Shared LLM client over OpenRouter (OpenAI-compatible). Retries transient
// errors and falls back to a second free model. Key stays server-side.
//
// Secrets:
//   OPENROUTER_API_KEY   (required)  — from https://openrouter.ai/keys
//   OPENROUTER_MODEL     (optional)  — primary model id
//   OPENROUTER_MODEL_FALLBACK (optional)

const BASE = "https://openrouter.ai/api/v1/chat/completions";

// Try several free models in order; a 429/5xx on one rolls to the next.
// Override the first with OPENROUTER_MODEL. Verify live slugs at
// https://openrouter.ai/models?max_price=0 (free catalogue rotates).
const MODELS = [
  ...(Deno.env.get("OPENROUTER_MODEL") ? [Deno.env.get("OPENROUTER_MODEL")] : []),
  ...(Deno.env.get("OPENROUTER_MODEL_FALLBACK") ? [Deno.env.get("OPENROUTER_MODEL_FALLBACK")] : []),
  "openrouter/owl-alpha",
  "moonshotai/kimi-k2.6:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
].filter((m, i, a) => m && a.indexOf(m) === i);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface LLMArgs {
  prompt: string;
  system?: string;
  json?: boolean;       // ask for a JSON object response
  temperature?: number;
}

/** Calls OpenRouter; returns the assistant message text. Throws on hard failure. */
export async function callLLM({ prompt, system, json = false, temperature = 0.7 }: LLMArgs): Promise<string> {
  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: prompt },
  ];

  let lastErr = "";
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "HTTP-Referer": "https://northstar.app",
          "X-Title": "NorthStar",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      }
      lastErr = `OpenRouter ${res.status}: ${await res.text()}`;
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        await sleep(800 * (attempt + 1));
        continue; // retry same model, then fall through to fallback
      }
      if (res.status === 404 || res.status === 400) break; // bad/unavailable model → try fallback model
      throw new Error(lastErr); // other non-transient (auth, etc.)
    }
  }
  throw new Error(lastErr);
}

/** Parse a JSON object from model output, tolerating ```json fences / stray text. */
export function parseJsonLoose(text: string): any {
  if (!text) return {};
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a !== -1 && b > a) {
      try { return JSON.parse(s.slice(a, b + 1)); } catch { /* */ }
    }
    return {};
  }
}
