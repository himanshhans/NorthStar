-- Life Score upgrade: milestone completion timestamps (momentum) + daily snapshots (trend/EMA).

-- 1) when a milestone is completed, stamp completed_at (cleared if un-completed)
alter table public.milestones add column if not exists completed_at timestamptz;

create or replace function public.milestone_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'Completed' and (old.status is distinct from 'Completed') then
    new.completed_at = now();
  elsif new.status <> 'Completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists milestones_completed_at on public.milestones;
create trigger milestones_completed_at before update on public.milestones
  for each row execute function public.milestone_completed_at();

-- 2) one smoothed Life Score snapshot per user per day (for the real daily trend)
create table if not exists public.life_score_daily (
  user_id    text not null default public.requesting_user_id(),
  date       date not null default current_date,
  score      int not null,
  parts      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.life_score_daily enable row level security;

create policy "own life_score_daily" on public.life_score_daily
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());
