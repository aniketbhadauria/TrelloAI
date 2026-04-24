-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Shared workspace mode: every signed-in user reads/writes the same board row.

-- Cleanup legacy table if it exists.
drop table if exists public.user_boards;

create table if not exists public.app_boards (
  id text primary key default 'shared',
  data jsonb not null default '{"boards": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh automatically.
create or replace function public.set_app_boards_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_app_boards_updated_at on public.app_boards;
create trigger trg_app_boards_updated_at
before update on public.app_boards
for each row
execute function public.set_app_boards_updated_at();

-- Shared access for all clients using the anon key.
alter table public.app_boards disable row level security;

-- Migrate legacy default row to shared row when safe.
update public.app_boards
set id = 'shared'
where id = 'default'
  and not exists (
    select 1
    from public.app_boards
    where id = 'shared'
  );

-- Ensure the shared row exists.
insert into public.app_boards (id, data)
values ('shared', '{"boards": []}')
on conflict (id) do nothing;

alter table public.app_users disable row level security;

