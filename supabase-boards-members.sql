-- boards: one row per board (replaces per-user JSONB blob in app_boards)
CREATE TABLE IF NOT EXISTS public.boards (
  id          TEXT        PRIMARY KEY,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- board_members: junction table for access control
CREATE TABLE IF NOT EXISTS public.board_members (
  board_id    TEXT        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member', 'observer')),
  invited_by  UUID        REFERENCES auth.users(id),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

-- Enable RLS
ALTER TABLE public.boards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- boards policies
CREATE POLICY "boards_select" ON public.boards FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "boards_insert" ON public.boards FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "boards_update" ON public.boards FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_id = boards.id AND user_id = auth.uid()
        AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "boards_delete" ON public.boards FOR DELETE
  USING (owner_id = auth.uid());

-- board_members policies
-- SELECT: any user who can access the board sees all its members
CREATE POLICY "board_members_select" ON public.board_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id
        AND (
          owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.board_members bm2
            WHERE bm2.board_id = board_members.board_id
              AND bm2.user_id = auth.uid()
          )
        )
    )
  );

-- INSERT: owner or existing admin
CREATE POLICY "board_members_insert" ON public.board_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

-- UPDATE: owner or admin (for role changes)
CREATE POLICY "board_members_update" ON public.board_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

-- DELETE: owner, admin, or the member themselves (leave board)
CREATE POLICY "board_members_delete" ON public.board_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
    OR user_id = auth.uid()
  );

-- Enable realtime for the new boards table
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
