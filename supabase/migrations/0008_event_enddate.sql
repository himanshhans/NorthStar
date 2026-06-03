-- Multi-day events: optional end date (null = single day).
alter table public.events add column if not exists end_date date;
