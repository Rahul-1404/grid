import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import type { Agent, AgentActivity, PermissionRequest } from '../types';
import { getSocket } from '../lib/socket';
import { useWorkspaceStore } from './workspaceStore';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AgentState {
  agents: Agent[];
  activities: AgentActivity[];
  selectedAgentId: string | null;
  socket: Socket | null;
  pendingPermissions: PermissionRequest[];
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  updateAgentStatus: (id: string, status: Agent['status']) => void;
  setSelectedAgent: (id: string | null) => void;
  addActivity: (activity: AgentActivity) => void;
  connectSocket: () => void;
  joinWorkspaceRoom: (workspaceId: string) => void;
  connectAgent: (name: string, capabilities?: string[]) => Promise<{ id: string; token: string; wsUrl: string }>;
  disconnectAgent: (id: string) => void;
  sendAgentMessage: (agentId: string, text: string, context?: any) => void;
  respondToPermission: (requestId: string, approved: boolean) => void;
}

function mapBackendStatus(status: string): Agent['status'] {
  switch (status) {
    case 'ONLINE': return 'online';
    case 'BUSY': return 'busy';
    case 'RECONNECTING': return 'reconnecting';
    default: return 'offline';
  }
}

function formatAgentActivity(status: Agent['status'], lastActivity?: string, currentAction?: string): string {
  if (currentAction) return currentAction;
  if (status === 'reconnecting') return 'Reconnecting...';
  if (status === 'online') return 'Online';
  if (status === 'busy') return 'Busy';
  if (!lastActivity) return 'Offline';
  const diff = Date.now() - new Date(lastActivity).getTime();
  if (diff < 60000) return 'Last seen just now';
  if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
  return 'Offline';
}

const AGENT_COLORS = ['#8B5CF6', '#A855F7', '#7C3AED', '#6D28D9', '#9333EA'];
function pickColor(index: number) {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}

let _currentWorkspaceRoom: string | null = null;

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  activities: [],
  selectedAgentId: null,
  socket: null,
  pendingPermissions: [],

  addAgent: (agent) => set((s) => {
    const exists = s.agents.find((a) => a.id === agent.id || a.name.toLowerCase() === agent.name.toLowerCase());
    if (exists) {
      return { agents: s.agents.map((a) => (a.id === exists.id ? { ...a, ...agent } : a)) };
    }
    return { agents: [...s.agents, agent] };
  }),
  removeAgent: (id) => set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),
  updateAgentStatus: (id, status) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, status } : a)),
    })),
  setSelectedAgent: (selectedAgentId) => set({ selectedAgentId }),
  addActivity: (activity) => set((s) => ({ activities: [activity, ...s.activities] })),

  respondToPermission: (requestId, approved) => {
    const { socket } = get();
    if (socket) {
      socket.emit('permission:respond', { requestId, approved });
    }
    set((s) => ({
      pendingPermissions: s.pendingPermissions.filter((p) => p.id !== requestId),
    }));
  },

  joinWorkspaceRoom: (workspaceId: string) => {
    const { socket } = get();
    if (!socket) return;
    // Leave old room
    if (_currentWorkspaceRoom) {
      socket.emit('workspace:leave', { workspaceId: _currentWorkspaceRoom });
    }
    // Join new room
    _currentWorkspaceRoom = workspaceId;
    socket.emit('workspace:join', { workspaceId });
  },

  connectSocket: () => {
    if (get().socket) return;
    const socket = getSocket();

    socket.on('connect', () => {
      // On connect, join current workspace room
      const wsId = useWorkspaceStore.getState().currentWorkspaceId;
      if (wsId) {
        _currentWorkspaceRoom = wsId;
        socket.emit('workspace:join', { workspaceId: wsId });
      }
    });

    socket.on('agent:list', (list: any[]) => {
      const seen = new Map<string, any>();
      for (const a of list) {
        const key = a.name.toLowerCase();
        seen.set(key, a);
      }
      const deduped = [...seen.values()];
      const agents: Agent[] = deduped.map((a, i) => ({
        id: a.id,
        name: a.name,
        status: mapBackendStatus(a.status),
        color: pickColor(i),
        capabilities: a.capabilities || [],
        lastActivity: formatAgentActivity(mapBackendStatus(a.status), a.lastActivity, a.currentAction),
        currentDocId: a.currentDocId,
        currentAction: a.currentAction,
        workspaceId: a.workspaceId,
        addedBy: a.addedBy,
      }));
      set({ agents });
    });

    socket.on('agent:status', (data: any) => {
      const { agents } = get();
      const exists = agents.find((a) => a.id === data.id || a.name.toLowerCase() === (data.name || '').toLowerCase());
      const newStatus = mapBackendStatus(data.status);
      const activity = formatAgentActivity(newStatus, data.lastActivity, data.currentAction);
      if (exists) {
        set({
          agents: agents.map((a) =>
            a.id === data.id
              ? { ...a, status: newStatus, capabilities: data.capabilities || a.capabilities, lastActivity: activity, currentDocId: data.currentDocId, currentAction: data.currentAction, workspaceId: data.workspaceId, addedBy: data.addedBy }
              : a
          ),
        });
      } else {
        set({
          agents: [
            ...agents,
            {
              id: data.id,
              name: data.name,
              status: newStatus,
              color: pickColor(agents.length),
              capabilities: data.capabilities || [],
              lastActivity: activity,
              currentDocId: data.currentDocId,
              currentAction: data.currentAction,
              workspaceId: data.workspaceId,
              addedBy: data.addedBy,
            },
          ],
        });
      }
    });

    socket.on('agent:message', (data: any) => {
      get().addActivity({
        id: `act-${Date.now()}`,
        agentId: data.agentId,
        agentName: data.agentName,
        action: 'messaged',
        detail: data.text,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    socket.on('agent:activity', (data: any) => {
      get().addActivity(data);
    });

    // Permission requests from agents
    socket.on('permission:request', (data: PermissionRequest) => {
      set((s) => ({
        pendingPermissions: [...s.pendingPermissions, data],
      }));
    });

    socket.on('permission:resolved', (data: any) => {
      set((s) => ({
        pendingPermissions: s.pendingPermissions.filter((p) => p.id !== data.id),
      }));
    });

    socket.on('doc:created', (data: { doc: { id: string; title: string; icon?: string; createdAt: string; updatedAt: string } }) => {
      const wsStore = useWorkspaceStore.getState();
      wsStore.addDocument({
        id: data.doc.id,
        title: data.doc.title,
        icon: data.doc.icon,
        createdAt: data.doc.createdAt,
        updatedAt: data.doc.updatedAt,
      });
    });

    socket.on('doc:updated', (data: { docId: string; title?: string; content?: string }) => {
      if (data.title) {
        const wsStore = useWorkspaceStore.getState();
        wsStore.updateDocTitle(data.docId, data.title);
      }
    });

    socket.on('doc:activity', (data: { agentName: string; action: string; docTitle: string }) => {
      get().addActivity({
        id: `act-${Date.now()}`,
        agentId: 'system',
        agentName: data.agentName,
        action: `${data.action} doc`,
        detail: data.docTitle,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      // Disconnected from backend — socket.io will auto-reconnect
    });

    // Subscribe to workspace changes to auto-switch rooms
    useWorkspaceStore.subscribe((state, prevState) => {
      if (state.currentWorkspaceId !== prevState.currentWorkspaceId && state.currentWorkspaceId) {
        get().joinWorkspaceRoom(state.currentWorkspaceId);
      }
    });

    set({ socket });
  },

  connectAgent: async (name, capabilities = []) => {
    const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
    const res = await fetch(`${BACKEND_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, capabilities, workspaceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${res.status})`);
    }
    const data = await res.json();
    return data;
  },

  disconnectAgent: (id) => {
    const { socket } = get();
    if (socket) {
      socket.emit('agent:disconnect', { id });
    }
  },

  sendAgentMessage: (agentId, text, context) => {
    const { socket } = get();
    if (socket) {
      socket.emit('agent:message', { agentId, text, context });
    }
  },
}));
