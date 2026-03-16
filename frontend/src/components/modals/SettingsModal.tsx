import { useState, useEffect } from 'react';
import { useWorkspaceStore, selectWorkspaceName } from '../../stores/workspaceStore';
import { useEditorStore } from '../../stores/editorStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { useAgentStore } from '../../stores/agentStore';
import { useThemeStore } from '../../stores/themeStore';

// BUG-3: TODO — Clerk sign-in redirect URL must be configured in the Clerk dashboard (can't fix from code)

function usePreference(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(`grid-pref-${key}`);
    return stored !== null ? stored === 'true' : defaultValue;
  });
  const set = (v: boolean) => {
    localStorage.setItem(`grid-pref-${key}`, String(v));
    setValue(v);
  };
  return [value, set];
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
    >
      <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${checked ? 'right-0.5 bg-white' : 'left-0.5 bg-text-secondary'}`} />
    </button>
  );
}

export default function SettingsModal() {
  const name = useWorkspaceStore(selectWorkspaceName);
  const setName = useWorkspaceStore((s) => s.setName);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const currentWorkspace = useWorkspaceStore((s) => s.workspaces.find((w) => w.id === s.currentWorkspaceId));
  const { setShowSettingsModal, setShowInviteModal, setShowAddAgentModal } = useEditorStore();
  const people = usePeopleStore((s) => s.people);
  const agents = useAgentStore((s) => s.agents);
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'agents' | 'billing'>('general');
  const [workspaceName, setWorkspaceName] = useState(name);

  // BUG-4: Persisted toggle preferences
  const [compactMode, setCompactMode] = usePreference('compact-mode', false);
  const [showAgentActivity, setShowAgentActivity] = usePreference('show-agent-activity', true);
  const [autoApproveAgents, setAutoApproveAgents] = usePreference('auto-approve-agents', false);

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'members' as const, label: 'Members' },
    { id: 'agents' as const, label: 'Agents' },
    { id: 'billing' as const, label: 'Billing' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
      <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-[680px] max-h-[520px] flex overflow-hidden animate-in">
        {/* Sidebar */}
        <div className="w-[200px] border-r border-border p-4 space-y-1 shrink-0">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Settings</h2>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-surface-hover text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-text-primary mb-4">Workspace</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">Name</label>
                    <input
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value);
                        if (e.target.value.trim()) {
                          setName(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text-primary outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">Icon</label>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${currentWorkspace?.color || 'from-accent to-agent'} flex items-center justify-center text-xl font-bold text-white cursor-pointer hover:opacity-80 transition-opacity`}>
                      {currentWorkspace?.icon || name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h3 className="text-base font-semibold text-text-primary mb-4">Preferences</h3>
                <div className="space-y-3">
                  {/* BUG-10: Theme toggle */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-text-secondary">Dark mode</span>
                    <Toggle checked={theme === 'dark'} onChange={() => toggleTheme()} />
                  </label>
                  {/* BUG-4: Functional toggles with localStorage persistence */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-text-secondary">Compact mode</span>
                    <Toggle checked={compactMode} onChange={setCompactMode} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-text-secondary">Show agent activity in editor</span>
                    <Toggle checked={showAgentActivity} onChange={setShowAgentActivity} />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-text-secondary">Auto-approve trusted agents</span>
                    <Toggle checked={autoApproveAgents} onChange={setAutoApproveAgents} />
                  </label>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h3 className="text-base font-semibold text-danger mb-2">Danger Zone</h3>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this workspace? This cannot be undone.')) {
                      deleteWorkspace(currentWorkspaceId);
                      setShowSettingsModal(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-danger/30 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  Delete Workspace
                </button>
              </div>
            </div>
          )}

          {/* BUG-5: Members tab uses real data from usePeopleStore */}
          {activeTab === 'members' && (
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-4">Members</h3>
              <p className="text-sm text-text-secondary mb-4">Manage who has access to this workspace.</p>
              <div className="space-y-2">
                {people.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-hover/50 transition-colors">
                    <div>
                      <div className="text-sm text-text-primary">{m.name}</div>
                      <div className="text-xs text-text-tertiary">{m.email || ''}</div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary">{i === 0 ? 'Owner' : 'Member'}</span>
                  </div>
                ))}
              </div>
              {/* BUG-7: Invite Member button wired */}
              <button
                onClick={() => { setShowSettingsModal(false); setShowInviteModal(true); }}
                className="mt-4 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Invite Member
              </button>
            </div>
          )}

          {/* BUG-6: Agents tab uses real data from useAgentStore */}
          {activeTab === 'agents' && (
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-4">Connected Agents</h3>
              <p className="text-sm text-text-secondary mb-4">Manage agents connected to this workspace.</p>
              <div className="space-y-2">
                {agents.length === 0 && (
                  <p className="text-sm text-text-tertiary py-4 text-center">No agents connected yet.</p>
                )}
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-hover/50 transition-colors">
                    <div>
                      <div className="text-sm text-text-primary">{a.name}</div>
                      <div className="text-xs text-text-tertiary">{a.capabilities?.join(', ') || 'Agent'}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      a.status === 'online' ? 'bg-online/15 text-online' :
                      a.status === 'busy' ? 'bg-busy/15 text-busy' :
                      'bg-surface-hover text-text-tertiary'
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
              {/* BUG-8: Add Agent button wired */}
              <button
                onClick={() => { setShowSettingsModal(false); setShowAddAgentModal(true); }}
                className="mt-4 px-4 py-2 rounded-lg bg-agent text-white text-sm font-medium hover:bg-agent-hover transition-colors"
              >
                Add Agent
              </button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-4">Billing</h3>
              <div className="p-4 rounded-lg border border-border bg-bg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Free Plan</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-online/15 text-online">Active</span>
                </div>
                <p className="text-xs text-text-tertiary mb-3">5 humans, unlimited agents</p>
                {/* BUG-16: Upgrade button with handler */}
                <button
                  onClick={() => alert('Pro plan coming soon! We\'ll notify you when it\'s available.')}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Upgrade to Pro — $8/human/mo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
