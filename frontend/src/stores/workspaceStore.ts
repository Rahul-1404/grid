import { create } from 'zustand';
import type { Document, Workspace, DocProperty } from '../types';
import { supabase } from '../lib/supabase';
import type { DbWorkspace, DbDocument, DbWorkspaceMember } from '../lib/supabase';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  currentDocId: string | null;
  searchOpen: boolean;
  loading: boolean;
  userId: string | null;

  // Init
  loadWorkspaces: (userId: string) => Promise<void>;
  joinWorkspace: (code: string, user: { id: string; name: string; avatar?: string }) => Promise<{ success: boolean; error?: string }>;

  // Workspace actions
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string, color?: string) => void;
  deleteWorkspace: (id: string) => void;

  // Existing actions
  setName: (name: string) => void;
  setDocuments: (docs: Document[]) => void;
  setCurrentDoc: (id: string) => void;
  addDocument: (doc: Document) => void;
  updateDocTitle: (id: string, title: string) => void;
  updateDocIcon: (id: string, icon: string) => void;
  toggleFavorite: (id: string) => void;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string) => void;
  reorderDocuments: (fromIndex: number, toIndex: number) => void;
  setSearchOpen: (open: boolean) => void;
  updateDocTags: (id: string, tags: string[]) => void;
  updateDocProperty: (id: string, propId: string, value: unknown) => void;
  addDocProperty: (id: string, prop: DocProperty) => void;
  removeDocProperty: (id: string, propId: string) => void;
  updateDocCover: (id: string, cover: string | undefined) => void;
}

// ── Seed data for new workspaces ───────────────────────────────
function makeSeedDocs(workspaceId: string): Document[] {
  const now = new Date().toISOString();
  return [
    {
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Getting Started',
      icon: '🚀',
      createdAt: now,
      updatedAt: now,
      favorite: true,
      tags: ['guide', 'onboarding'],
      properties: [
        { id: 'p1', name: 'Status', type: 'select', value: 'Published', options: ['Draft', 'In Review', 'Published', 'Archived'], color: '#22C55E' },
        { id: 'p2', name: 'Author', type: 'person', value: 'You' },
        { id: 'p3', name: 'Last reviewed', type: 'date', value: now.split('T')[0] },
      ],
    },
    {
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Project Roadmap',
      icon: '🗺️',
      createdAt: now,
      updatedAt: now,
      tags: ['planning', 'roadmap'],
      properties: [
        { id: 'p1', name: 'Status', type: 'select', value: 'In Review', options: ['Draft', 'In Review', 'Published', 'Archived'], color: '#EAB308' },
        { id: 'p2', name: 'Sprint', type: 'text', value: 'Q2 2026' },
        { id: 'p3', name: 'Priority', type: 'select', value: 'High', options: ['Low', 'Medium', 'High', 'Critical'], color: '#EF4444' },
      ],
    },
    {
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      title: 'API Documentation',
      icon: '📡',
      createdAt: now,
      updatedAt: now,
      tags: ['api', 'technical'],
      properties: [
        { id: 'p1', name: 'Status', type: 'select', value: 'Draft', options: ['Draft', 'In Review', 'Published', 'Archived'], color: '#6E6E7A' },
        { id: 'p2', name: 'Version', type: 'text', value: 'v1.0' },
        { id: 'p3', name: 'Public', type: 'checkbox', value: false },
      ],
    },
  ];
}

// ── DB helpers ──────────────────────────────────────────────────
function docToDb(doc: Document, workspaceId: string): DbDocument {
  return {
    id: doc.id,
    workspace_id: workspaceId,
    title: doc.title,
    icon: doc.icon ?? null,
    favorite: doc.favorite ?? false,
    properties: doc.properties ?? [],
    tags: doc.tags ?? [],
    cover: doc.cover ?? null,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

function dbToDoc(row: DbDocument): Document {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon ?? undefined,
    favorite: row.favorite,
    properties: (row.properties as DocProperty[]) ?? [],
    tags: row.tags ?? [],
    cover: row.cover ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbToWorkspace(row: DbWorkspace, docs: Document[], role?: 'owner' | 'member'): Workspace {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    documents: docs,
    role,
  };
}

// ── Debounce util ──────────────────────────────────────────────
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function debouncedUpdate(key: string, fn: () => void, ms = 500) {
  clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, ms);
}

// Helper to update docs in a specific workspace
function updateWorkspaceDocs(
  workspaces: Workspace[],
  wsId: string,
  updater: (docs: Document[]) => Document[]
): Workspace[] {
  return workspaces.map((ws) =>
    ws.id === wsId ? { ...ws, documents: updater(ws.documents) } : ws
  );
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: '',
  currentDocId: null,
  searchOpen: false,
  loading: true,
  userId: null,

  // ── Load from Supabase ─────────────────────────────────────
  loadWorkspaces: async (userId: string) => {
    set({ loading: true, userId });

    // Fetch workspace IDs this user is a member of (owned + joined)
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId);

    const membershipMap: Record<string, string> = {};
    for (const m of memberships ?? []) {
      membershipMap[m.workspace_id] = m.role;
    }
    const wsIds = Object.keys(membershipMap);

    let workspaces: Workspace[] = [];

    if (wsIds.length > 0) {
      // Fetch workspaces and their docs
      const { data: wsRows } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', wsIds);

      const { data: docRows } = await supabase
        .from('documents')
        .select('*')
        .in('workspace_id', wsIds)
        .order('created_at', { ascending: true });

      const docsByWs: Record<string, Document[]> = {};
      for (const row of (docRows ?? []) as DbDocument[]) {
        const wsId = row.workspace_id;
        if (!docsByWs[wsId]) docsByWs[wsId] = [];
        docsByWs[wsId].push(dbToDoc(row));
      }

      workspaces = ((wsRows ?? []) as DbWorkspace[]).map((ws) =>
        dbToWorkspace(ws, docsByWs[ws.id] ?? [], membershipMap[ws.id] as 'owner' | 'member')
      );
    }

    // New user: create default workspace with seed docs
    if (workspaces.length === 0) {
      const wsId = `ws-${crypto.randomUUID().slice(0, 8)}`;
      const seedDocs = makeSeedDocs(wsId);

      const wsRow: DbWorkspace = {
        id: wsId,
        name: 'Grid Workspace',
        icon: 'G',
        color: 'from-accent to-agent',
        owner_id: userId,
        created_at: new Date().toISOString(),
      };

      await supabase.from('workspaces').insert(wsRow);
      await supabase.from('workspace_members').insert({
        workspace_id: wsId,
        user_id: userId,
        role: 'owner',
        user_name: (globalThis as any).__gridUserName || null,
        user_avatar: (globalThis as any).__gridUserAvatar || null,
      });
      await supabase
        .from('documents')
        .insert(seedDocs.map((d) => docToDb(d, wsId)));

      workspaces = [dbToWorkspace(wsRow, seedDocs)];
    }

    const currentWs = workspaces[0];
    set({
      workspaces,
      currentWorkspaceId: currentWs.id,
      currentDocId: currentWs.documents[0]?.id ?? null,
      loading: false,
    });
  },

  switchWorkspace: (id) => {
    const ws = get().workspaces.find((w) => w.id === id);
    if (!ws) return;
    set({ currentWorkspaceId: id, currentDocId: ws.documents[0]?.id || null });
  },

  createWorkspace: (name, color) => {
    const userId = get().userId;
    const id = `ws-${crypto.randomUUID().slice(0, 8)}`;
    const ws: Workspace = {
      id,
      name,
      icon: name.charAt(0).toUpperCase(),
      color: color || 'from-emerald-500 to-teal-500',
      createdAt: new Date().toISOString(),
      documents: [],
    };
    set((s) => ({ workspaces: [...s.workspaces, ws] }));

    // Persist
    supabase.from('workspaces').insert({
      id,
      name: ws.name,
      icon: ws.icon ?? null,
      color: ws.color ?? null,
      owner_id: userId ?? '',
      created_at: ws.createdAt,
    } satisfies DbWorkspace).then(() => {
      if (userId) {
        supabase.from('workspace_members').insert({
          workspace_id: id,
          user_id: userId,
          role: 'owner',
          user_name: (globalThis as any).__gridUserName || null,
          user_avatar: (globalThis as any).__gridUserAvatar || null,
        }).then(() => {});
      }
    });
  },

  deleteWorkspace: (id) => {
    set((s) => {
      const remaining = s.workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) return s;
      const newCurrentId = s.currentWorkspaceId === id ? remaining[0].id : s.currentWorkspaceId;
      const newWs = remaining.find((w) => w.id === newCurrentId)!;
      return {
        workspaces: remaining,
        currentWorkspaceId: newCurrentId,
        currentDocId: newWs.documents[0]?.id || null,
      };
    });
    // Delete docs and membership first, then workspace
    Promise.all([
      supabase.from('documents').delete().eq('workspace_id', id),
      supabase.from('workspace_members').delete().eq('workspace_id', id),
    ]).then(() => {
      supabase.from('workspaces').delete().eq('id', id).then(() => {});
    });
  },

  joinWorkspace: async (code, user) => {
    // 1. Look up invite
    const { data: invite, error: inviteErr } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('code', code)
      .single();

    if (inviteErr || !invite) {
      return { success: false, error: 'Invalid invite link' };
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Invite link has expired' };
    }

    const workspaceId = invite.workspace_id;

    // 2. Check if already a member
    const { data: existing } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Already a member, just switch to it
      const ws = get().workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        set({ currentWorkspaceId: workspaceId, currentDocId: ws.documents[0]?.id || null });
      }
      return { success: true };
    }

    // 3. Insert into workspace_members
    const memberRow: Partial<DbWorkspaceMember> = {
      workspace_id: workspaceId,
      user_id: user.id,
      role: 'member',
      user_name: user.name,
      user_avatar: user.avatar ?? null,
    };
    const { error: memberErr } = await supabase.from('workspace_members').insert(memberRow);
    if (memberErr) {
      return { success: false, error: 'Failed to join workspace' };
    }

    // 4. Reload workspaces and switch
    await get().loadWorkspaces(user.id);
    const ws = get().workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      set({ currentWorkspaceId: workspaceId, currentDocId: ws.documents[0]?.id || null });
    }

    return { success: true };
  },

  setName: (name) => {
    if (!name.trim()) return; // Prevent empty workspace names
    const wsId = get().currentWorkspaceId;
    set((s) => ({
      workspaces: s.workspaces.map((ws) =>
        ws.id === wsId ? { ...ws, name } : ws
      ),
    }));
    debouncedUpdate(`ws-name-${wsId}`, () => {
      supabase.from('workspaces').update({ name }).eq('id', wsId).then(() => {});
    });
  },

  setDocuments: (documents) =>
    set((s) => ({
      workspaces: s.workspaces.map((ws) =>
        ws.id === s.currentWorkspaceId ? { ...ws, documents } : ws
      ),
    })),

  setCurrentDoc: (currentDocId) => set({ currentDocId }),

  addDocument: (doc) => {
    const wsId = get().currentWorkspaceId;
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) => [...docs, doc]),
    }));
    supabase.from('documents').insert(docToDb(doc, wsId)).then(() => {});
  },

  updateDocTitle: (id, title) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    // Truncate extremely long titles to prevent UI overflow
    const trimmedTitle = title.slice(0, 200);
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, title: trimmedTitle, updatedAt: now } : d))
      ),
    }));
    debouncedUpdate(`doc-title-${id}`, () => {
      supabase.from('documents').update({ title: trimmedTitle, updated_at: now }).eq('id', id).then(() => {});
    });
  },

  updateDocIcon: (id, icon) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, icon, updatedAt: now } : d))
      ),
    }));
    debouncedUpdate(`doc-icon-${id}`, () => {
      supabase.from('documents').update({ icon, updated_at: now }).eq('id', id).then(() => {});
    });
  },

  toggleFavorite: (id) => {
    const wsId = get().currentWorkspaceId;
    const ws = get().workspaces.find((w) => w.id === wsId);
    const doc = ws?.documents.find((d) => d.id === id);
    const newFav = !doc?.favorite;
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, favorite: newFav } : d))
      ),
    }));
    supabase.from('documents').update({ favorite: newFav, updated_at: new Date().toISOString() }).eq('id', id).then(() => {});
  },

  deleteDocument: (id) => {
    const wsId = get().currentWorkspaceId;
    set((s) => {
      const newWorkspaces = updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.filter((d) => d.id !== id)
      );
      const currentWsDocs = newWorkspaces.find((w) => w.id === wsId)!.documents;
      const newCurrent = s.currentDocId === id ? (currentWsDocs[0]?.id || null) : s.currentDocId;
      return { workspaces: newWorkspaces, currentDocId: newCurrent };
    });
    supabase.from('documents').delete().eq('id', id).then(() => {});
  },

  duplicateDocument: (id) => {
    const wsId = get().currentWorkspaceId;
    const ws = get().workspaces.find((w) => w.id === wsId);
    const doc = ws?.documents.find((d) => d.id === id);
    if (!doc) return;
    const newDoc: Document = {
      ...doc,
      id: `doc-${crypto.randomUUID().slice(0, 8)}`,
      title: `${doc.title} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
    };
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) => [...docs, newDoc]),
      currentDocId: newDoc.id, // Auto-select the duplicated document
    }));
    supabase.from('documents').insert(docToDb(newDoc, wsId)).then(() => {});
  },

  reorderDocuments: (fromIndex, toIndex) => {
    const wsId = get().currentWorkspaceId;
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) => {
        const arr = [...docs];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return arr;
      }),
    }));
    // Persist new order by updating each doc's updated_at to encode order
    debouncedUpdate(`doc-reorder-${wsId}`, () => {
      const ws = get().workspaces.find((w) => w.id === wsId);
      if (!ws) return;
      const now = new Date();
      ws.documents.forEach((doc, idx) => {
        // Use a tiny offset per index to preserve ordering in DB
        const ts = new Date(now.getTime() - (ws.documents.length - idx)).toISOString();
        supabase.from('documents').update({ updated_at: ts }).eq('id', doc.id).then(() => {});
      });
    });
  },

  setSearchOpen: (searchOpen) => set({ searchOpen }),

  updateDocTags: (id, tags) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, tags, updatedAt: now } : d))
      ),
    }));
    debouncedUpdate(`doc-tags-${id}`, () => {
      supabase.from('documents').update({ tags, updated_at: now }).eq('id', id).then(() => {});
    });
  },

  updateDocProperty: (id, propId, value) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) =>
          d.id === id
            ? { ...d, properties: (d.properties || []).map((p) => (p.id === propId ? { ...p, value } : p)), updatedAt: now }
            : d
        )
      ),
    }));
    debouncedUpdate(`doc-prop-${id}`, () => {
      const ws = get().workspaces.find((w) => w.id === wsId);
      const doc = ws?.documents.find((d) => d.id === id);
      supabase.from('documents').update({ properties: doc?.properties ?? [], updated_at: now }).eq('id', id).then(() => {});
    });
  },

  addDocProperty: (id, prop) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, properties: [...(d.properties || []), prop], updatedAt: now } : d))
      ),
    }));
    debouncedUpdate(`doc-prop-${id}`, () => {
      const ws = get().workspaces.find((w) => w.id === wsId);
      const doc = ws?.documents.find((d) => d.id === id);
      supabase.from('documents').update({ properties: doc?.properties ?? [], updated_at: now }).eq('id', id).then(() => {});
    });
  },

  removeDocProperty: (id, propId) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, properties: (d.properties || []).filter((p) => p.id !== propId), updatedAt: now } : d))
      ),
    }));
    debouncedUpdate(`doc-prop-${id}`, () => {
      const ws = get().workspaces.find((w) => w.id === wsId);
      const doc = ws?.documents.find((d) => d.id === id);
      supabase.from('documents').update({ properties: doc?.properties ?? [], updated_at: now }).eq('id', id).then(() => {});
    });
  },

  updateDocCover: (id, cover) => {
    const wsId = get().currentWorkspaceId;
    const now = new Date().toISOString();
    set((s) => ({
      workspaces: updateWorkspaceDocs(s.workspaces, wsId, (docs) =>
        docs.map((d) => (d.id === id ? { ...d, cover, updatedAt: now } : d))
      ),
    }));
    supabase.from('documents').update({ cover: cover ?? null, updated_at: now }).eq('id', id).then(() => {});
  },
}));

// Selectors for derived state
export const selectDocuments = (s: WorkspaceState) =>
  s.workspaces.find((w) => w.id === s.currentWorkspaceId)?.documents ?? [];

export const selectWorkspaceName = (s: WorkspaceState) =>
  s.workspaces.find((w) => w.id === s.currentWorkspaceId)?.name ?? '';
