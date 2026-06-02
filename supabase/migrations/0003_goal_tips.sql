-- AI-generated success tips per goal (cached so they're generated once).
alter table public.goals add column if not exists tips jsonb not null default '[]'::jsonb;
