-- Time commitment per goal ({ hoursPerDay, daysPerWeek }) — drives realistic, buffered roadmaps.
alter table public.goals add column if not exists commitment jsonb not null default '{}'::jsonb;
