-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Drop the old auth-based table if it exists
drop table if exists public.user_boards;

-- Table to store board data as a JSON document (no auth required)
create table if not exists public.app_boards (
  id text primary key default 'default',
  data jsonb not null default '{"boards": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Disable RLS so anyone with the anon key can read/write
alter table public.app_boards disable row level security;

-- Seed with an empty row
insert into public.app_boards (id, data)
values ('default', '{"boards": []}')
on conflict (id) do nothing;
