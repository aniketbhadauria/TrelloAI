-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.user_boards;

-- Create optimized app_boards table
CREATE TABLE IF NOT EXISTS public.app_boards (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '{"boards": []}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_app_boards_updated_at ON public.app_boards(updated_at);

-- Add comment for documentation
COMMENT ON TABLE public.app_boards IS 'Stores user board configurations';
COMMENT ON COLUMN public.app_boards.id IS 'User ID from Supabase auth (UUID) or ''default'' for legacy';
COMMENT ON COLUMN public.app_boards.data IS 'JSON structure containing user''s boards array';

-- Disable RLS for now (will tighten later)
ALTER TABLE public.app_boards DISABLE ROW LEVEL SECURITY;

-- Insert default record efficiently
-- INSERT INTO public.app_boards (id, data)
-- VALUES ('default', '{"boards": []}'::JSONB)
-- ON CONFLICT (id) DO NOTHING;
INSERT INTO public.app_boards (id, data, updated_at)
VALUES ('shared', '{"boards": []}', NOW())
ON CONFLICT (id) DO NOTHING;

-- Optional: Add a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_app_boards_updated_at ON public.app_boards;
CREATE TRIGGER update_app_boards_updated_at
  BEFORE UPDATE ON public.app_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();