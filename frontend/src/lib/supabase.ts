import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Database types ──────────────────────────────────────────────
export interface DbWorkspace {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  owner_id: string;
  created_at: string;
}

export interface DbWorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_name?: string | null;
  user_avatar?: string | null;
}

export interface DbWorkspaceInvite {
  id: string;
  workspace_id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
}

export interface DbDocument {
  id: string;
  workspace_id: string;
  title: string;
  icon: string | null;
  favorite: boolean;
  properties: unknown;
  tags: string[] | null;
  cover: string | null;
  created_at: string;
  updated_at: string;
}
