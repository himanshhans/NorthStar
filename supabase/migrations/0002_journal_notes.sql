-- Journal entries + rich notes on goals.

-- Markdown notes per goal
alter table public.goals add column if not exists notes text;

-- Free-form journal with optional AI insight
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default public.requesting_user_id(),
  date        date not null default current_date,
  content     text not null,
  mood        text,           -- optional self-rated mood (e.g. 'great','ok','low')
  ai_response text,           -- AI reflection on the entry
  created_at  timestamptz not null default now()
);
create index if not exists journal_user_date_idx on public.journal_entries(user_id, date desc);

alter table public.journal_entries enable row level security;

create policy "own journal" on public.journal_entries
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
