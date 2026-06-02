-- Focus sessions ("grow an element while you focus"). Completed ones populate the garden.
create table if not exists public.focus_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default public.requesting_user_id(),
  element      text not null,                 -- plant species: pine | tree | bush | tulip | daisy
  duration_sec int not null,                  -- intended focus length
  focused_sec  int not null default 0,        -- actually focused
  completed    boolean not null default false,
  task         text,                          -- optional: what you focused on
  created_at   timestamptz not null default now()
);
create index if not exists focus_user_idx on public.focus_sessions(user_id, created_at desc);

alter table public.focus_sessions enable row level security;

create policy "own focus_sessions" on public.focus_sessions
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
