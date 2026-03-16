import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '../../lib/socket';
import { useAgentStore } from '../../stores/agentStore';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore, selectDocuments } from '../../stores/workspaceStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { getInitial, timeAgo } from '../../lib/utils';

interface ActivityItem {
  id: string;
  actorName: string;
  actorType: 'agent' | 'human';
  action: string;
  detail: string;
  timestamp: string;
}

const MAX_ACTIVITIES = 50;

export default function ActivityPanel() {
  const { activities: agentActivities } = useAgentStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const socketListenersSet = useRef(false);

  const addActivity = useCallback((item: ActivityItem) => {
    setActivities((prev) => {
      const next = [item, ...prev];
      return next.length > MAX_ACTIVITIES ? next.slice(0, MAX_ACTIVITIES) : next;
    });
  }, []);

  useEffect(() => {
    if (socketListenersSet.current) return;
    socketListenersSet.current = true;

    const socket = getSocket();

    const onDocCreated = (data: { doc: { title: string }; agentName?: string; userName?: string }) => {
      const name = data.agentName || data.userName || 'Someone';
      const isAgent = !!data.agentName;
      addActivity({
        id: `act-${Date.now()}-${Math.random()}`,
        actorName: name,
        actorType: isAgent ? 'agent' : 'human',
        action: 'created new doc',
        detail: data.doc.title,
        timestamp: new Date().toISOString(),
      });
    };

    const onDocUpdated = (data: { docId: string; title?: string; agentName?: string; userName?: string }) => {
      const name = data.agentName || data.userName || 'Someone';
      const isAgent = !!data.agentName;
      addActivity({
        id: `act-${Date.now()}-${Math.random()}`,
        actorName: name,
        actorType: isAgent ? 'agent' : 'human',
        action: 'edited',
        detail: data.title || data.docId,
        timestamp: new Date().toISOString(),
      });
    };

    const onDocActivity = (data: { agentName: string; action: string; docTitle: string }) => {
      addActivity({
        id: `act-${Date.now()}-${Math.random()}`,
        actorName: data.agentName,
        actorType: 'agent',
        action: data.action,
        detail: data.docTitle,
        timestamp: new Date().toISOString(),
      });
    };

    const onCommentReply = (data: { reply?: { author?: { name?: string }; isAgent?: boolean; text?: string }; commentId?: string }) => {
      if (!data.reply) return;
      const name = data.reply.author?.name || 'Someone';
      addActivity({
        id: `act-${Date.now()}-${Math.random()}`,
        actorName: name,
        actorType: data.reply.isAgent ? 'agent' : 'human',
        action: 'replied to comment',
        detail: data.reply.text?.slice(0, 60) || '',
        timestamp: new Date().toISOString(),
      });
    };

    const onAgentStatus = (data: { name: string; status: string }) => {
      if (data.status === 'ONLINE') {
        addActivity({
          id: `act-${Date.now()}-${Math.random()}`,
          actorName: data.name,
          actorType: 'agent',
          action: 'came online',
          detail: '',
          timestamp: new Date().toISOString(),
        });
      }
    };

    socket.on('doc:created', onDocCreated);
    socket.on('doc:updated', onDocUpdated);
    socket.on('doc:activity', onDocActivity);
    socket.on('comment:reply', onCommentReply);
    socket.on('agent:status', onAgentStatus);

    return () => {
      socket.off('doc:created', onDocCreated);
      socket.off('doc:updated', onDocUpdated);
      socket.off('doc:activity', onDocActivity);
      socket.off('comment:reply', onCommentReply);
      socket.off('agent:status', onAgentStatus);
      socketListenersSet.current = false;
    };
  }, [addActivity]);

  // Track human edits via docContent changes (debounced)
  const { docContent } = useEditorStore();
  const { currentDocId } = useWorkspaceStore();
  const documents = useWorkspaceStore(selectDocuments);
  const { currentUser } = usePeopleStore();
  const lastEditRef = useRef<number>(0);

  useEffect(() => {
    if (!docContent || !currentDocId) return;
    const now = Date.now();
    // Debounce: only log an edit every 30 seconds
    if (now - lastEditRef.current < 30000) return;
    lastEditRef.current = now;
    const doc = documents.find((d) => d.id === currentDocId);
    addActivity({
      id: `act-${now}-human`,
      actorName: currentUser.name,
      actorType: 'human',
      action: 'edited',
      detail: doc?.title || 'Untitled',
      timestamp: new Date().toISOString(),
    });
  }, [docContent, currentDocId, documents, currentUser.name, addActivity]);

  // Merge agent store activities into the feed on mount
  useEffect(() => {
    if (agentActivities.length === 0) return;
    const mapped: ActivityItem[] = agentActivities.map((a) => ({
      id: a.id,
      actorName: a.agentName,
      actorType: 'agent' as const,
      action: a.action,
      detail: a.detail,
      timestamp: a.timestamp,
    }));
    setActivities((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      const newItems = mapped.filter((m) => !ids.has(m.id));
      if (newItems.length === 0) return prev;
      const merged = [...newItems, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return merged.slice(0, MAX_ACTIVITIES);
    });
  }, [agentActivities]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Activity</h3>
        <p className="text-xs text-text-tertiary mt-0.5">Real-time feed of agent and human actions</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="px-4 py-3 border-b border-border hover:bg-surface-hover/30 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${
                activity.actorType === 'agent' ? 'bg-agent' : 'bg-accent'
              }`}>
                {getInitial(activity.actorName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-text-primary">{activity.actorName}</span>
                  {activity.actorType === 'agent' && (
                    <span className="px-1 py-0.5 rounded text-[9px] bg-agent/15 text-agent font-medium">AI</span>
                  )}
                  <span className="text-xs text-text-tertiary">{activity.action}</span>
                </div>
                {activity.detail && (
                  <p className="text-sm text-text-secondary mt-0.5 truncate">{activity.detail}</p>
                )}
                <span className="text-[10px] text-text-tertiary mt-1 block">{timeAgo(activity.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="text-3xl mb-2">-_-</div>
            <div className="text-text-tertiary text-sm">No activity yet</div>
            <div className="text-text-tertiary text-xs mt-1">Agent and human actions will appear here in real-time</div>
          </div>
        )}
      </div>
    </div>
  );
}
