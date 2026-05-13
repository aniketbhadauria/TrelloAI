-- card_comments: stores rich-text comments per card
create table if not exists card_comments (
  id           uuid primary key default gen_random_uuid(),
  board_id     text not null,
  card_id      text not null,
  author_email text not null,
  author_name  text not null,
  content      jsonb not null,
  created_at   timestamptz not null default now()
);

alter table card_comments enable row level security;

create policy "board members can view comments"
  on card_comments for select
  using (
    exists (
      select 1 from board_members
      where board_members.board_id = card_comments.board_id
        and board_members.user_id = auth.uid()
    )
  );

create policy "board members can insert comments"
  on card_comments for insert
  with check (
    exists (
      select 1 from board_members
      where board_members.board_id = card_comments.board_id
        and board_members.user_id = auth.uid()
    )
  );

create policy "authors can delete own comments"
  on card_comments for delete
  using (author_email = auth.email());

alter publication supabase_realtime add table card_comments;

-- card_activity: append-only event log per card
create table if not exists card_activity (
  id          uuid primary key default gen_random_uuid(),
  board_id    text not null,
  card_id     text not null,
  actor_email text not null,
  actor_name  text not null,
  type        text not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table card_activity enable row level security;

create policy "board members can view activity"
  on card_activity for select
  using (
    exists (
      select 1 from board_members
      where board_members.board_id = card_activity.board_id
        and board_members.user_id = auth.uid()
    )
  );

create policy "board members can insert activity"
  on card_activity for insert
  with check (
    exists (
      select 1 from board_members
      where board_members.board_id = card_activity.board_id
        and board_members.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table card_activity;
