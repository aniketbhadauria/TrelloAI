-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Drop the old auth-based table if it exists
drop table if exists public.user_boards;

-- One row per user: id = Supabase auth user UUID (text). Legacy demo row id may be 'default'.
create table if not exists public.app_boards (
  id text primary key default 'default',
  data jsonb not null default '{"boards": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Disable RLS so anyone with the anon key can read/write (tighten later with supabase-migration-per-user-boards.sql)
alter table public.app_boards disable row level security;

-- Optional legacy seed (not used by logged-in app users; server/AI tools may still reference it)
insert into public.app_boards (id, data)
values ('default', '{"boards": []}')
on conflict (id) do nothing;
