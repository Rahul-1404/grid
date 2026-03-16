import { useAgentStore } from '../../stores/agentStore';
import { useEditorStore } from '../../stores/editorStore';
import { useCommentStore } from '../../stores/commentStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { getInitial, generateId } from '../../lib/utils';
import { IconX } from '../../lib/icons';

export default function AgentDetailPanel() {
  const { agents, selectedAgentId, setSelectedAgent, disconnectAgent, activities } = useAgentStore();
  const { setPanelView } = useEditorStore();
  const currentWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.currentWorkspaceId));
  const userId = useWorkspaceStore((s) => s.userId);

  const agent = agents.find((a) => a.id === selectedAgentId);
  if (!agent) return null;

  const statusLabel = agent.status === 'online' ? 'Online' : agent.status === 'busy' ? 'Busy' : agent.status === 'reconnecting' ? 'Reconnecting' : 'Offline';
  const statusColor = agent.status === 'online' ? 'text-online' : agent.status === 'busy' ? 'text-busy' : 'text-offline';
  const statusDot = agent.status === 'online' ? 'bg-online' : agent.status === 'busy' ? 'bg-busy' : 'bg-offline';

  // Permission check: can this user disconnect the agent?
  const isOwner = currentWorkspace?.role === 'owner';
  const isAdder = agent.addedBy === userId;
  const canDisconnect = isOwner || isAdder;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Agent Details</h3>
        <button
          onClick={() => {
            setSelectedAgent(null);
            setPanelView('none');
          }}
          className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3 ring-2 ring-agent/30"
            style={{ backgroundColor: agent.color }}
          >
            {getInitial(agent.name)}
          </div>
          <h4 className="text-lg font-semibold text-text-primary">{agent.name}</h4>
          <div className={`flex items-center gap-1.5 mt-1 ${statusColor}`}>
            <div className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-xs font-medium">{statusLabel}</span>
          </div>
        </div>

        {agent.addedBy && (
          <div className="mb-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Connected by
            </h5>
            <p className="text-sm text-text-secondary">{agent.addedBy === userId ? 'You' : agent.addedBy}</p>
          </div>
        )}

        {agent.workspaceId && (
          <div className="mb-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1">
              Workspace
            </h5>
            <p className="text-sm text-text-secondary">{currentWorkspace?.name || agent.workspaceId}</p>
          </div>
        )}

        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="mb-6">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              Capabilities
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-1 text-xs rounded-md bg-agent/10 text-agent border border-agent/20"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}

        {agent.lastActivity && (
          <div className="mb-6">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              Current Activity
            </h5>
            <p className="text-sm text-text-secondary">{agent.lastActivity}</p>
          </div>
        )}

        <div className="mb-6">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
            Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={() => {
                const currentDocId = useWorkspaceStore.getState().currentDocId;
                const currentUser = usePeopleStore.getState().currentUser;
                if (currentDocId) {
                  const commentId = `comment-${generateId()}`;
                  useCommentStore.getState().addComment({
                    id: commentId,
                    documentId: currentDocId,
                    text: `@${agent.name} `,
                    quotedText: '',
                    author: currentUser,
                    isAgent: false,
                    createdAt: new Date().toISOString(),
                    resolved: false,
                    selectionFrom: 0,
                    selectionTo: 0,
                    replies: [],
                  });
                  setPanelView('comments');
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-agent/10 text-agent text-sm font-medium hover:bg-agent/20 transition-colors border border-agent/20"
            >
              @Mention in Comments
            </button>
            <button
              onClick={() => setPanelView('activity')}
              className="w-full px-3 py-2 rounded-lg bg-surface-hover text-text-secondary text-sm font-medium hover:text-text-primary transition-colors border border-border"
            >
              View History
            </button>
            {canDisconnect && (
              <button
                onClick={() => {
                  if (confirm(`Disconnect ${agent.name}?`)) {
                    disconnectAgent(agent.id);
                    setSelectedAgent(null);
                    setPanelView('none');
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-surface-hover text-danger text-sm font-medium hover:bg-danger/10 transition-colors border border-border"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
