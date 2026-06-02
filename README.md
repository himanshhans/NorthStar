# ★ NorthStar

**Your personal AI coach, analyst, and mentor — in the browser.**

NorthStar turns big goals into a daily system. You describe where you want to go; it breaks the goal into milestones, tracks your habits and check-ins, reflects on your days, reviews your weeks, and intelligently re-plans when life gets in the way.

Built first for one person, designed to scale to thousands.

---

## ✨ Features

### Goal engine
- Create goals (title, category, target date, description)
- **AI milestone generator** — a 2-step agent: web-grounded research (real book page counts, skill syllabi) → a dynamic-length, structured roadmap
- Goal templates for one-tap starts
- Status management: Active / Paused / Completed / Abandoned
- **Roadmap views** — vertical timeline *and* a drag-and-drop Kanban board (To-do / In-progress / Done)
- Per-goal **markdown notes**

### Daily system
- **Morning intention** — 1–3 focus tasks tied to active goals (feeds the dashboard)
- **Mid-day nudge** — one-tap pulse (on track / slow / blocked)
- **Evening reflection** — guided prompts + free text, with honest AI coaching feedback

### Tracking & intelligence
- **Habit tracker** — daily completion, streaks, GitHub-style heatmap, link habits to goals
- **Life Score (0–100)** — composite of milestone progress (40%) + check-in (30%) + habit (30%) consistency, with per-category breakdown
- **Weekly deep-dive review** — AI summary, one pattern, three concrete adjustments; exportable to PDF
- **Recovery / catch-up** — detects overdue milestones, reschedules, and breaks a missed milestone into smaller steps via AI
- **Analytics** — Life Score trend, weekly habit completions, check-in heatmap
- **Calendar** — milestones, check-ins, and habit reps on a month grid
- **AI journal** — free-form entries with mood + AI reflection

### Polish
- Light / dark theme (system default + persistent toggle)
- Command palette (**⌘K / Ctrl+K**) with global search + quick actions
- Browser check-in reminders
- First-run onboarding, loading skeletons, empty states, keyboard focus styles
- Fully responsive (mobile drawer nav)

---

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 (semantic theme tokens) |
| State / data | Zustand + TanStack React Query |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + Row Level Security) |
| AI | OpenRouter (free LLMs, e.g. DeepSeek V3 / Llama 3.3 70B), via Supabase Edge Functions (Deno) |
| Charts | Recharts · **Drag & drop** dnd-kit · **Markdown** marked + DOMPurify |

**Architecture note:** All AI calls run inside Supabase Edge Functions so the LLM key stays server-side, never in the browser. Each function also verifies the Clerk JWT before calling the model. Clerk issues the session JWT; Supabase RLS authorizes each row by `auth.jwt()->>'sub'`.

---

## 🚀 Getting started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Clerk](https://clerk.com) application
- An [OpenRouter](https://openrouter.ai/keys) API key (`sk-or-...`) — free models available

### 1. Install
```bash
npm install
```

### 2. Environment
Copy `.env.example` to `.env` and fill in:
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # Supabase "publishable" key
```
> The Gemini key is **not** a frontend variable — it lives as a Supabase secret (step 5).

See [`SETUP.md`](./SETUP.md) for the full account walkthrough, including connecting Clerk as a third-party auth provider in Supabase.

### 3. Database
Run the migrations in order in the Supabase **SQL Editor**:
1. `supabase/migrations/0001_init.sql` — core tables + RLS
2. `supabase/migrations/0002_journal_notes.sql` — journal + goal notes

### 4. Edge functions
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324:free   # optional
npx supabase secrets set CLERK_ISSUER=https://<your-app>.clerk.accounts.dev     # verifies Clerk JWTs

npx supabase functions deploy generate-milestones --no-verify-jwt
npx supabase functions deploy reflection-feedback --no-verify-jwt
npx supabase functions deploy weekly-review --no-verify-jwt
npx supabase functions deploy recovery-replan --no-verify-jwt
npx supabase functions deploy journal-insight --no-verify-jwt
npx supabase functions deploy goal-tips --no-verify-jwt
```

### 5. Run
```bash
npm run dev
```

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint |

---

## 📁 Project structure

```
src/
  components/   # Layout, UI primitives, Logo, Heatmap, CommandPalette,
                # MilestoneBoard, Onboarding, ReminderManager, ThemeToggle …
  pages/        # Dashboard, Goals, GoalNew, GoalDetail, Habits, Calendar,
                # Journal, Review, Analytics, Settings, check-ins, Landing, Login
  hooks/        # useGoals, useHabits, useCheckins, useLifeScore,
                # useWeeklyReview, useAnalytics, useCalendar, useJournal
  lib/          # supabase, theme, reminders, markdown, queryClient, exportPdf
supabase/
  migrations/   # SQL schema + RLS
  functions/    # Deno edge functions (Gemini-powered)
```

---

## 🔐 Security

- Gemini API key is server-only (Supabase secret) — never shipped to the browser
- Every user-owned table is protected by Row Level Security keyed on the Clerk user id
- `.env` is gitignored; only `.env.example` is committed

---

## 🗺 Roadmap

Build phases and the full feature checklist live in [`Plan.md`](./Plan.md).
Future ideas: accountability partner mode, voice check-ins, Google Calendar sync, true background push notifications, public profiles.

---

*Built with React, Supabase, Clerk, and Gemini.*
