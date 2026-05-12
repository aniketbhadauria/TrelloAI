-- ============================================================
-- Migration: Shared workspace + Notifications
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure a shared workspace row exists for all users
INSERT INTO public.app_boards (id, data)
VALUES ('shared', '{"boards": []}')
ON CONFLICT (id) DO NOTHING;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  board_id text,
  card_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disable RLS for simplicity (tighten for production)
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_notifications_email ON public.notifications (user_email, created_at DESC);

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
