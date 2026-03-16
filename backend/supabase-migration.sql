-- Workspace sharing migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Create workspace_invites table
CREATE TABLE IF NOT EXISTS workspace_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id text NOT NULL,
  code text UNIQUE NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_code ON workspace_invites(code);

-- 2. Add user_name and user_avatar columns to workspace_members
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS user_avatar text;

-- 3. Enable RLS with open policy on workspace_invites
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workspace_invites' AND policyname = 'workspace_invites_open'
  ) THEN
    CREATE POLICY workspace_invites_open ON workspace_invites FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
