-- NorthStar initial schema
-- Auth model: Clerk issues the JWT. The Clerk user id arrives as auth.jwt()->>'sub'.
-- Every user-owned row stores that id in `user_id` (text) and RLS enforces ownership.

-- Helper: current Clerk user id from the verified JWT.
create or replace function public.requesting_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::text;
$$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  user_id     text primary key default public.requesting_user_id(),
  email       text,
  name        text,
  avatar      text,
  preferences jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- goals ----------
create table if not exists public.goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null default public.requesting_user_id(),
  title            text not null,
  category         text not null check (category in ('Personal','Career','Learning')),
  description      text,
  target_date      date,
  status           text not null default 'Active'
                     check (status in ('Active','Paused','Completed','Abandoned')),
  life_score_weight numeric not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);

-- ---------- milestones ----------
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.goals(id) on delete cascade,
  user_id     text not null default public.requesting_user_id(),
  title       text not null,
  description text,
  due_date    date,
  status      text not null default 'Pending'
                check (status in ('Pending','InProgress','Completed','Skipped')),
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists milestones_goal_idx on public.milestones(goal_id);

-- ---------- habits ----------
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.requesting_user_id(),
  goal_id     uuid references public.goals(id) on delete set null,
  title       text not null,
  frequency   text not null default 'daily'
                check (frequency in ('daily','weekdays','custom')),
  target_days int[] not null default '{}',   -- 0=Sun..6=Sat, used when frequency='custom'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits(user_id);

-- ---------- habit_logs ----------
create table if not exists public.habit_logs (
  id        uuid primary key default gen_random_uuid(),
  habit_id  uuid not null references public.habits(id) on delete cascade,
  user_id   text not null default public.requesting_user_id(),
  date      date not null,
  completed boolean not null default true,
  note      text,
  unique (habit_id, date)
);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, date);

-- ---------- checkins ----------
create table if not exists public.checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.requesting_user_id(),
  type        text not null check (type in ('morning','midday','evening')),
  date        date not null default current_date,
  content     jsonb not null default '{}'::jsonb,
  ai_response text,
  created_at  timestamptz not null default now()
);
create index if not exists checkins_user_date_idx on public.checkins(user_id, date);

-- ---------- weekly_reviews ----------
create table if not exists public.weekly_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null default public.requesting_user_id(),
  week_start     date not null,
  summary        text,
  ai_insights    text,
  score_snapshot jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------- updated_at trigger for goals ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

-- ============ Row Level Security ============
alter table public.profiles       enable row level security;
alter table public.goals          enable row level security;
alter table public.milestones     enable row level security;
alter table public.habits         enable row level security;
alter table public.habit_logs     enable row level security;
alter table public.checkins       enable row level security;
alter table public.weekly_reviews enable row level security;

-- One owner policy per table: full access to your own rows only.
create policy "own profile"  on public.profiles
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own goals" on public.goals
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own milestones" on public.milestones
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own habits" on public.habits
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own habit_logs" on public.habit_logs
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own checkins" on public.checkins
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own weekly_reviews" on public.weekly_reviews
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
