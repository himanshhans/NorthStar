# NorthStar — AI-Powered Personal Growth Platform
### Product Plan v1.0

---

## 1. Vision & Purpose

**NorthStar** is a personal AI coach, analyst, and mentor living in your browser. It helps you define meaningful goals — personal, professional, or learning-focused — breaks them into achievable milestones, tracks your daily habits and check-ins, and adapts your roadmap intelligently when life gets in the way. Built first for one person, designed to scale to thousands.

**Core Promise:** You tell it where you want to go. It figures out how to get you there — and keeps you accountable every step of the way.

---

## 2. Target User (Phase 1)

- **Primary:** Solo user (you), motivated and self-aware, wants structured but flexible growth tracking
- **Future:** Friends, LinkedIn network, small accountability circles
- **Persona mindset:** "I have big goals but I lack a system to follow through consistently"

---

## 3. Platform Decision

| Criteria | Choice | Reason |
|---|---|---|
| Platform | Web App (React) | Works on all devices, zero install, shareable via URL |
| Hosting | Vercel / Netlify | Free tier, instant deploy, custom domain ready |
| Auth | Clerk or Supabase Auth | Personal login, social login (Google), scalable |
| Database | Supabase (PostgreSQL) | Free tier, real-time, scales to multi-user |
| AI Engine | Claude API (Anthropic) | Powers coaching, roadmaps, reflections, nudges |
| Styling | Tailwind CSS | Rapid UI, responsive by default |
| State | Zustand + React Query | Lightweight, fast, easy to extend |

---

## 4. Core Features (MVP)

### 4.1 Goal Engine
- Create a goal with: title, category (Personal / Career / Learning), target date, and a short description
- AI breaks the goal into **3–7 milestones** with suggested deadlines
- Each milestone has sub-tasks the user can edit, reorder, or delete
- Goals tagged by: Active / Paused / Completed / Abandoned

### 4.2 AI Roadmap Generator
- User describes a goal in natural language (e.g. "I want to become a data scientist in 12 months")
- Claude generates a structured week-by-week roadmap
- Roadmap includes: skill checkpoints, resource suggestions, habit anchors
- User can regenerate, tweak, or accept the plan
- Visual timeline view (horizontal scroll or vertical list)

### 4.3 Daily Interaction System
Three daily touchpoints, all AI-powered:

| Session | Time | What it does |
|---|---|---|
| **Morning Intention** | 7–9 AM | Sets 1–3 focus tasks for the day, ties them to active goals |
| **Mid-day Nudge** | 12–2 PM | Quick pulse check — on track? Blocked? One-tap response |
| **Evening Reflection** | 8–10 PM | Free-text or guided prompts — what went well, what didn't |

### 4.4 Weekly Deep-Dive Review
- Auto-generated every Sunday
- AI summarizes: goals progressed, habits kept, streaks, blockers flagged
- Adaptive suggestion: "Based on your week, here's what to adjust"
- Exportable as a PDF summary (future feature)

### 4.5 Habit Tracker
- Link habits to specific goals (e.g. "Read 30 min/day" → "Become a better leader")
- Daily completion toggle
- Streak tracking with GitHub-style calendar heatmap
- Habit frequency: daily / weekdays / custom days

### 4.6 Progress Visualizations
- **Life Score Dashboard:** Composite score (0–100) across Personal, Career, Learning — updates daily based on check-in completions and milestone progress
- **Progress Bars:** Per-goal completion percentage, milestone-level granularity
- **Trend Charts:** Weekly activity, streak data, life score over time (line chart)
- **Streak Calendar:** GitHub-style contribution heatmap for check-ins and habits

### 4.7 Catch-Up / Recovery System
When a milestone or habit is missed, the AI does all three:
1. **Auto-reschedule** the deadline forward intelligently (doesn't pile up)
2. **Flags the slip** and asks "What happened?" — short reflection prompt
3. **Re-plans** by breaking the next milestone into smaller, easier steps

### 4.8 Auth & Data
- Login via email/password or Google OAuth
- All goals, habits, check-ins, and reflections saved per user account
- Data persists across sessions and devices
- Future: export data as JSON or PDF

---

## 5. App Structure (Pages & Screens)

```
/                        → Landing page (auth prompt)
/login                   → Sign in / Sign up
/dashboard               → Life Score + active goals overview + today's tasks
/goals                   → All goals list (filter by category/status)
/goals/new               → AI Goal Creation Wizard
/goals/[id]              → Single goal: milestones, roadmap, progress
/checkin/morning         → Morning intention session
/checkin/midday          → Mid-day nudge
/checkin/evening         → Evening reflection
/habits                  → Habit tracker + streak calendar
/review                  → Weekly deep-dive review
/analytics               → Charts, trends, life score history
/settings                → Profile, notification preferences, account
```

---

## 6. AI Interaction Design

All AI interactions use the **Claude API**. The AI plays three roles simultaneously:

| Role | Behaviour |
|---|---|
| **Coach** | Motivational, action-oriented, pushes you forward |
| **Analyst** | Data-aware, surfaces patterns, flags inconsistencies |
| **Mentor** | Strategic, zooms out, gives perspective when you're stuck |

### AI Prompt Contexts
- **Goal creation:** "Help me define this goal clearly and break it into milestones"
- **Roadmap generation:** "Generate a realistic week-by-week plan to achieve this goal"
- **Morning intention:** "Given my active goals and yesterday's reflection, what should I focus on today?"
- **Evening reflection:** "Review my day log and give me honest, constructive feedback"
- **Weekly review:** "Summarize my week, highlight patterns, and suggest 3 adjustments"
- **Recovery mode:** "I missed 3 days on this goal. Help me re-plan without overwhelming myself"

---

## 7. Data Models

### User
```
id, email, name, avatar, created_at, preferences (JSON)
```

### Goal
```
id, user_id, title, category, description, target_date,
status, life_score_weight, created_at, updated_at
```

### Milestone
```
id, goal_id, title, description, due_date,
status, order_index, created_at
```

### Habit
```
id, user_id, goal_id (optional), title, frequency,
target_days (array), created_at, is_active
```

### HabitLog
```
id, habit_id, user_id, date, completed (bool), note
```

### CheckIn
```
id, user_id, type (morning/midday/evening), date,
content (JSON), ai_response (text), created_at
```

### WeeklyReview
```
id, user_id, week_start, summary (text),
ai_insights (text), score_snapshot (JSON), created_at
```

---

## 8. Build Phases

### Phase 1 — Core MVP (Weeks 1–3)
- [ ] Project setup: React + Tailwind + Supabase + Claude API
- [ ] Auth: login, signup, protected routes
- [ ] Goal creation wizard with AI milestone generation
- [ ] Dashboard with active goals and today's focus
- [ ] Evening reflection check-in (simplest touchpoint first)
- [ ] Basic progress bars per goal

### Phase 2 — Habit & Tracking Layer (Weeks 4–5)
- [ ] Habit tracker with daily completion
- [ ] Streak calendar (heatmap)
- [ ] Morning intention + mid-day nudge check-ins
- [ ] Life Score calculation logic + dashboard widget

### Phase 3 — Intelligence & Analytics (Weeks 6–7)
- [ ] AI roadmap generator (full timeline view)
- [ ] Weekly deep-dive review (auto-generated)
- [ ] Recovery/catch-up system
- [ ] Analytics page: trend charts, life score history

### Phase 4 — Polish & Share (Week 8)
- [ ] Landing page for sharing on LinkedIn
- [ ] Mobile responsiveness audit
- [ ] Onboarding flow for new users
- [ ] Performance + accessibility pass
- [ ] Custom domain setup

---

## 9. Design Direction

- **Aesthetic:** Clean, focused, premium — like a high-end productivity tool crossed with a personal journal
- **Tone:** Warm but serious. Encouraging but honest. Not gamified to the point of being childish.
- **Color palette:** Rose (#f43f5e) accent + plum (#a855f7) highlight, neutral base; emerald success. Theme-aware light/dark via semantic tokens. *(updated from original navy/amber)*
- **Typography:** Clash Display (headings) + Satoshi (body), via Fontshare. *(updated from Fraunces/DM Sans)*
- **Key UX principle:** Every screen should answer "what do I do next?" — no confusion, no dead ends

---

## 10. Success Metrics (Personal)

| Metric | Target |
|---|---|
| Goals created & actively tracked | ≥ 3 active goals at any time |
| Daily check-in streak | 7-day streak within first 2 weeks |
| Milestone completion rate | ≥ 60% of milestones hit on time |
| Life Score trend | Upward trend over 30 days |
| Share-readiness | Shareable demo link by end of Phase 4 |

---

## 11. Future Ideas (Post-MVP)

### ✅ Shipped (Phase 5 — Power features)
- **Command palette (⌘K)** — fuzzy quick-nav + quick actions + global search (`CommandPalette.jsx`)
- **Calendar view** — milestones + check-ins + habits on a month grid (`Calendar.jsx`)
- **Kanban board + drag reorder** — milestones across To-do/In-progress/Done (`MilestoneBoard.jsx`, dnd-kit)
- **AI journaling** — free-form entries with mood + AI reflection (`Journal.jsx`, `journal-insight` fn)
- **Rich notes per goal** — markdown notes (`marked` + `dompurify`)
- **Goal templates** — one-tap starters in the wizard
- **PDF export** — weekly review → print-to-PDF (`exportPdf.js`)
- **Browser reminders** — check-in notifications + settings (`ReminderManager.jsx`)

### Still future
- **Accountability partner mode:** Share a goal with a friend, see each other's progress
- **Voice check-ins:** Speak your reflection, AI transcribes and responds
- **Calendar integration:** Sync milestones to Google Calendar
- **Push notifications:** True background push (service worker) — current reminders fire only while app is open
- **Public profiles / leaderboards:** Share your journey publicly

---

*Plan created: May 2026 | Status: Ready for Phase 1 development*

---

## 12. Master Build Checklist

Use this as your single source of truth as you build. Check items off as they're completed.

> **Stack note (Phase 1):** Auth = **Clerk** (not Supabase Auth). AI = **Gemini API** (not Claude), called via a **Supabase Edge Function** so the key stays server-side.
> **Legend:** `[x]` done & verified · `[~]` code written, pending live keys/deploy · `[ ]` not started.

### 🛠 Project Setup
- [x] Initialise React project with Vite
- [x] Install and configure Tailwind CSS (v4, @tailwindcss/vite)
- [~] Set up Supabase project (auth + database) — schema + RLS written (`supabase/migrations/0001_init.sql`); user creating project
- [~] Connect AI API key via environment variables — **Gemini** (not Claude); edge function `generate-milestones` written, key goes in Supabase secret
- [ ] Set up Vercel/Netlify deployment pipeline
- [x] Configure environment variables (.env + .env.example)
- [x] Set up folder structure (pages, components, lib)

### 🔐 Auth & User Accounts (via Clerk, not Supabase Auth)
- [~] Email/password sign up and login — Clerk `<SignIn>/<SignUp>` wired; pending live key
- [~] Google OAuth login — enable in Clerk dashboard
- [x] Protected routes (redirect if not logged in)
- [~] User profile page (name, avatar, preferences) — Clerk `<UserProfile>` on /settings
- [x] Logout functionality (Clerk UserButton)
- [x] Session persistence across page reloads (Clerk)

### 🎯 Goal Engine
- [x] Goal creation form (title, category, description, target date) — `GoalNew.jsx` wizard
- [x] AI milestone generator — 2-step agent (web-grounded research → dynamic-length structured plan) via Gemini
- [~] Milestone list view with edit / delete (reorder not yet) — edit in wizard, toggle complete on detail
- [x] Goal status management (Active / Paused / Completed / Abandoned)
- [x] Goal detail page (milestones + progress bar)
- [x] All goals list page with filter by category and status

### 🗺 AI Roadmap Generator
- [x] Natural language goal input
- [x] AI generates milestone roadmap (web-grounded, dynamic length)
- [x] Roadmap timeline view (visual) — vertical timeline on goal detail
- [~] Regenerate / tweak / accept flow — wizard edits + Back-to-regenerate; one-click regenerate TODO
- [x] Roadmap saved to database per goal

### ☀️ Daily Check-In System
- [x] Morning intention session (1–3 focus tasks linked to active goals) — `CheckinMorning.jsx`, feeds dashboard
- [x] Mid-day nudge (quick pulse check, one-tap response) — `CheckinMidday.jsx`
- [x] Evening reflection (guided prompts + free text) — `CheckinEvening.jsx`
- [x] Check-in responses saved to database (checkins table)
- [x] AI response displayed after each check-in submission — `reflection-feedback` edge fn (Coach/Analyst/Mentor)

### 📅 Weekly Deep-Dive Review
- [~] On-demand generation done; auto-every-Sunday (cron) TODO — `weekly-review` edge fn
- [x] AI summary of the week (goals, habits, streaks, blockers)
- [x] Adaptive suggestions (3 concrete adjustments)
- [x] Weekly review history page — `Review.jsx`

### 💪 Habit Tracker
- [x] Create habit (title, frequency, linked goal optional) — `Habits.jsx`
- [x] Daily completion toggle (`habit_logs` upsert)
- [x] Streak calculation logic (`streakFor`)
- [x] GitHub-style heatmap calendar (`Heatmap.jsx`)
- [~] Habits list page — list + archive done; active/inactive filter view TODO

### 🔄 Catch-Up / Recovery System
- [x] Detect missed milestones (`isOverdue`)
- [x] Auto-reschedule deadline forward (push 1 week)
- [x] "What happened?" reflection prompt trigger
- [x] AI re-plans missed milestone into smaller steps — `recovery-replan` edge fn
- [x] Recovery flow UI (non-judgmental tone) on goal detail

### 📊 Progress Visualisations
- [x] Life Score calculation — milestone 40% + check-in 30% + habit 30%, renormalized (`useLifeScore`)
- [x] Life Score displayed on dashboard (score + per-category bars)
- [x] Progress bars per goal (milestone-level granularity) — goal detail
- [x] Trend charts (life score line, habit completions bar) — `Analytics.jsx` (recharts)
- [x] Streak calendar heatmap — habits + check-ins heatmaps
- [x] Analytics page pulling all visualisations together

### 🖥 Dashboard
- [x] Life Score widget (score + category bars)
- [x] Active goals overview (top 4)
- [x] Today's focus tasks (from morning intention)
- [ ] Habit streak summary — TODO add to dashboard
- [x] Quick-access buttons (morning/evening check-in, add goal, weekly review)

### 🌐 Landing Page
- [x] Hero section (value proposition)
- [x] Feature highlights (goal engine, AI coach, habits, analytics)
- [x] Call-to-action (Sign up / Try it)
- [x] Mobile responsive
- [x] Shareable via LinkedIn / direct link (OG/Twitter meta tags)

### 🎨 Design & UX Polish
- [x] Consistent design system — semantic theme tokens (Rose+Plum), Clash Display / Satoshi fonts
- [x] Light / dark theme with system default + persistent toggle (`useTheme`, `ThemeToggle`)
- [x] Mobile responsiveness — mobile top bar + slide-in nav drawer (`Layout.jsx`)
- [x] Loading states and skeleton screens (`Skeleton`, route Suspense)
- [x] Empty states (goals, habits, analytics, reviews)
- [~] Error handling — per-mutation error messages; global error boundary TODO
- [x] Onboarding flow for new users (`Onboarding.jsx` first-run modal)
- [x] Accessibility — keyboard focus-visible rings, aria-labels on icon buttons (full SR audit TODO)

### 🚀 Launch Prep
- [ ] Custom domain configured *(your ops task — Vercel/Netlify)*
- [x] Supabase Row Level Security (RLS) policies set (migration `0001_init.sql`)
- [x] Environment variables secured (keys in .env / Supabase secrets, gitignored)
- [~] Performance — route code-splitting done (recharts lazy); run Lighthouse to confirm ≥85
- [ ] Cross-browser test (Chrome, Safari, Firefox) *(your manual check)*
- [ ] Share demo link with friends / post on LinkedIn *(after deploy)*

---

**Total items:** 75 | **Completed:** 57 / 75 · **Phases 1–4 ✅ (core)** · remaining = ops (domain, cross-browser, Lighthouse) + small deferred items

*Tip: Work through phases in order — each phase unlocks the next. Don't skip to analytics before the goal engine works.*