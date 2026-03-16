import { create } from 'zustand';
import { useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { IconX } from '../lib/icons';
import type { PermissionRequest } from '../types';

interface Toast {
  id: string;
  message: string;
  agentName?: string;
  agentColor?: string;
  timestamp: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...toast, id, timestamp: Date.now() }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Hook to listen for socket events and trigger toasts
export function useToastListener() {
  const socket = useAgentStore((s) => s.socket);
  const addToast = useToastStore((s) => s.addToast);
  const agents = useAgentStore((s) => s.agents);

  useEffect(() => {
    if (!socket) return;

    const onDocCreated = (data: any) => {
      const agentName = data.agentName || 'An agent';
      const agent = agents.find((a) => a.name === agentName);
      addToast({ message: `${agentName} created a new doc: ${data.doc?.title || 'Untitled'}`, agentName, agentColor: agent?.color });
    };

    const onDocUpdated = (data: any) => {
      if (!data.agentName) return;
      const agent = agents.find((a) => a.name === data.agentName);
      addToast({ message: `${data.agentName} edited ${data.title || 'a document'}`, agentName: data.agentName, agentColor: agent?.color });
    };

    const onDocActivity = (data: any) => {
      const agent = agents.find((a) => a.name === data.agentName);
      addToast({ message: `${data.agentName} ${data.action} ${data.docTitle}`, agentName: data.agentName, agentColor: agent?.color });
    };

    const onCommentReply = (data: any) => {
      const agentName = data.agentName || 'An agent';
      const agent = agents.find((a) => a.name === agentName);
      addToast({ message: `${agentName} replied to your comment`, agentName, agentColor: agent?.color });
    };

    socket.on('doc:created', onDocCreated);
    socket.on('doc:updated', onDocUpdated);
    socket.on('doc:activity', onDocActivity);
    socket.on('comment:reply', onCommentReply);

    return () => {
      socket.off('doc:created', onDocCreated);
      socket.off('doc:updated', onDocUpdated);
      socket.off('doc:activity', onDocActivity);
      socket.off('comment:reply', onCommentReply);
    };
  }, [socket, agents, addToast]);
}

function PermissionBanner({ request }: { request: PermissionRequest }) {
  const respond = useAgentStore((s) => s.respondToPermission);
  const agents = useAgentStore((s) => s.agents);
  const agent = agents.find((a) => a.id === request.agentId);

  return (
    <div className="pointer-events-auto flex items-center gap-3 bg-surface border border-amber-500/30 rounded-xl px-4 py-3 shadow-2xl min-w-[320px] max-w-[480px]">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: agent?.color || '#F59E0B' }}
      >
        {request.agentName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{request.agentName}</p>
        <p className="text-xs text-text-secondary truncate">{request.description}</p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={() => respond(request.id, false)}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
        >
          Deny
        </button>
        <button
          onClick={() => respond(request.id, true)}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
        >
          Approve
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const pendingPermissions = useAgentStore((s) => s.pendingPermissions);

  if (toasts.length === 0 && pendingPermissions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {/* Permission requests (persistent until responded to) */}
      {pendingPermissions.map((req) => (
        <PermissionBanner key={req.id} request={req} />
      ))}
      {/* Transient toasts */}
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 shadow-2xl min-w-[300px] max-w-[420px] animate-slide-in-toast"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: toast.agentColor || '#8B5CF6' }}
          >
            {toast.agentName ? toast.agentName.charAt(0).toUpperCase() : 'A'}
          </div>
          <p className="text-sm text-text-primary flex-1 min-w-0">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors flex-shrink-0"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
