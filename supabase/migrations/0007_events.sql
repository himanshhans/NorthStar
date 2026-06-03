-- Calendar events: click a date, add a titled event with an optional time.
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default public.requesting_user_id(),
  date       date not null,
  time       time,           -- optional time of day
  title      text not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists events_user_date_idx on public.events(user_id, date);

alter table public.events enable row level security;

create policy "own events" on public.events
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
