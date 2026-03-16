import { useWorkspaceStore, selectDocuments } from '../stores/workspaceStore';
import { useAgentStore } from '../stores/agentStore';
import { useEditorStore } from '../stores/editorStore';
import { IconPlus, IconFile } from '../lib/icons';
import { timeAgo } from '../lib/utils';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const documents = useWorkspaceStore(selectDocuments);
  const { setCurrentDoc, addDocument } = useWorkspaceStore();
  const agents = useAgentStore((s) => s.agents);
  const { setShowAddAgentModal, setShowInviteModal } = useEditorStore();

  const onlineAgents = agents.filter((a) => a.status === 'online').length;
  const offlineAgents = agents.filter((a) => a.status === 'offline').length;

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const handleNewDoc = () => {
    const id = `doc-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    addDocument({ id, title: 'Untitled', icon: '\uD83D\uDCC4', createdAt: now, updatedAt: now });
    setCurrentDoc(id);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-bg">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-12 py-16">
          {/* Greeting */}
          <h1 className="text-3xl font-bold text-text-primary mb-1">
            {getGreeting()}
          </h1>
          <p className="text-text-tertiary text-sm mb-10">
            What would you like to work on?
          </p>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <button
              onClick={handleNewDoc}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center group-hover:bg-accent/25 transition-colors">
                <IconPlus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-text-primary">New Document</span>
            </button>
            <button
              onClick={() => setShowAddAgentModal(true)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-agent/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-agent/15 text-agent flex items-center justify-center group-hover:bg-agent/25 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
              <span className="text-sm font-medium text-text-primary">Connect Agent</span>
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-online/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-online/15 text-online flex items-center justify-center group-hover:bg-online/25 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </div>
              <span className="text-sm font-medium text-text-primary">Invite Friend</span>
            </button>
          </div>

          {/* Agent status summary */}
          {agents.length > 0 && (
            <div className="flex items-center gap-4 mb-8 px-1">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-online" />
                {onlineAgents} agent{onlineAgents !== 1 ? 's' : ''} online
              </div>
              {offlineAgents > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <span className="w-2 h-2 rounded-full bg-text-tertiary" />
                  {offlineAgents} offline
                </div>
              )}
            </div>
          )}

          {/* Recent docs */}
          {recentDocs.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 px-1">
                Recently Edited
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {recentDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setCurrentDoc(doc.id)}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-accent/30 transition-all text-left group"
                  >
                    <div className="text-2xl flex-shrink-0 mt-0.5">{doc.icon || '\uD83D\uDCC4'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                        {doc.title || 'Untitled'}
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        Edited {timeAgo(doc.updatedAt)}
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-surface-hover text-text-tertiary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
