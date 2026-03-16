import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useWorkspaceStore, selectDocuments } from '../../stores/workspaceStore';
import { useAgentStore } from '../../stores/agentStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { useEditorStore } from '../../stores/editorStore';
import { useThemeStore } from '../../stores/themeStore';
import {
  IconFile, IconPlus, IconSearch, IconStar, IconStarFilled,
  IconSettings, IconTrash, IconCopy, IconChevronDown, IconChevronRight,
  IconCheck,
} from '../../lib/icons';
import { getInitial, generateId } from '../../lib/utils';

export default function Sidebar() {
  const {
    currentDocId, setCurrentDoc, addDocument,
    toggleFavorite, deleteDocument, duplicateDocument, reorderDocuments, setSearchOpen,
    workspaces, currentWorkspaceId, switchWorkspace,
  } = useWorkspaceStore();
  const documents = useWorkspaceStore(selectDocuments);

  // Derive name from current workspace
  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const name = currentWorkspace?.name ?? '';

  const { agents, setSelectedAgent } = useAgentStore();
  const { people } = usePeopleStore();
  const { setShowAddAgentModal, setShowInviteModal, setShowSettingsModal, setShowCreateWorkspaceModal, setPanelView } = useEditorStore();

  const [sectionsOpen, setSectionsOpen] = useState({ favorites: true, docs: true, agents: true, people: true });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const wsDropdownRef = useRef<HTMLDivElement>(null);

  const toggle = (key: keyof typeof sectionsOpen) =>
    setSectionsOpen((s) => ({ ...s, [key]: !s[key] }));

  const favorites = documents.filter((d) => d.favorite);

  const statusColor = (status: string) =>
    status === 'online' ? 'bg-online' : status === 'busy' ? 'bg-busy' : 'bg-offline';

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  // Close workspace dropdown on outside click
  useEffect(() => {
    if (!wsDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [wsDropdownOpen]);

  // Keyboard shortcut Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  const handleContextMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, docId });
  };

  const startRename = (docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (doc) {
      setRenamingId(docId);
      setRenameValue(doc.title);
    }
    setContextMenu(null);
  };

  const commitRename = () => {
    if (renamingId) {
      const trimmed = renameValue.trim();
      if (trimmed) {
        useWorkspaceStore.getState().updateDocTitle(renamingId, trimmed);
      }
      // If empty, revert silently (don't update)
    }
    setRenamingId(null);
  };

  const SectionHeader = ({ label, sectionKey, onAdd }: { label: string; sectionKey: keyof typeof sectionsOpen; onAdd?: () => void }) => (
    <div className="flex items-center justify-between mb-px px-1.5 group">
      <button
        onClick={() => toggle(sectionKey)}
        className="flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors py-1"
      >
        <span className="transition-transform duration-200" style={{ transform: sectionsOpen[sectionKey] ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <IconChevronDown className="w-2.5 h-2.5" />
        </span>
        {label}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          className="p-0.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
        >
          <IconPlus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const DocItem = ({ doc, idx }: { doc: typeof documents[0]; idx: number }) => {
    const isActive = currentDocId === doc.id;
    const isRenaming = renamingId === doc.id;

    return (
      <div
        draggable={!isRenaming}
        onDragStart={() => setDragIdx(idx)}
        onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
        onDragEnd={() => {
          if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
            reorderDocuments(dragIdx, dragOverIdx);
          }
          setDragIdx(null);
          setDragOverIdx(null);
        }}
        onContextMenu={(e) => handleContextMenu(e, doc.id)}
        onClick={() => !isRenaming && setCurrentDoc(doc.id)}
        className={`w-full flex items-center gap-2 px-2 py-[5px] rounded-[4px] text-[14px] text-left transition-all cursor-pointer group ${
          isActive
            ? 'bg-surface-hover text-text-primary font-medium'
            : 'text-text-secondary hover:bg-surface-hover/50 font-normal'
        } ${dragOverIdx === idx ? 'border-t-2 border-accent' : ''}`}
      >
        <span className="text-[16px] shrink-0 w-5 text-center leading-none">{doc.icon || ''}</span>
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1" title={doc.title}>{doc.title}</span>
        )}
        {doc.favorite && !isRenaming && (
          <IconStarFilled className="w-3 h-3 text-yellow-500 shrink-0 opacity-60" />
        )}
      </div>
    );
  };

  return (
    <div className="w-[240px] h-full bg-surface border-r border-border flex flex-col shrink-0 select-none">
      {/* Workspace header */}
      <div className="px-3 py-3 border-b border-border relative" ref={wsDropdownRef}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
            className="flex items-center gap-2 hover:bg-surface-hover rounded-md px-1 py-0.5 -mx-1 transition-colors"
          >
            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${currentWorkspace?.color || 'from-accent to-agent'} flex items-center justify-center text-[11px] font-bold text-white`}>
              {currentWorkspace?.icon || 'G'}
            </div>
            <span className="font-medium text-[14px] text-text-primary">{name}</span>
            <IconChevronDown className="w-3 h-3 text-text-tertiary" />
          </button>
          <ThemeToggle />
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
            title="Settings"
          >
            <IconSettings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Workspace Switcher Dropdown */}
        {wsDropdownOpen && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-surface border border-border rounded-lg shadow-2xl z-[110] overflow-hidden animate-in">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Workspaces
            </div>
            <div className="pb-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    switchWorkspace(ws.id);
                    setWsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${ws.color || 'from-accent to-agent'} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                    {ws.icon || ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm text-text-primary truncate">{ws.name}</span>
                    <span className="text-[11px] text-text-tertiary">{ws.documents.length} doc{ws.documents.length !== 1 ? 's' : ''}</span>
                  </div>
                  {ws.id === currentWorkspaceId && (
                    <IconCheck className="w-4 h-4 text-accent shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-border">
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  setShowCreateWorkspaceModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-hover transition-colors text-left text-text-secondary hover:text-text-primary"
              >
                <div className="w-7 h-7 rounded-md border border-border border-dashed flex items-center justify-center">
                  <IconPlus className="w-3.5 h-3.5 text-text-tertiary" />
                </div>
                <span className="text-sm">Create Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 pt-2 pb-1">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-text-tertiary bg-bg border border-border hover:border-border-light transition-colors"
        >
          <IconSearch className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-tertiary font-mono">⌘K</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-3">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div>
            <SectionHeader label="Favorites" sectionKey="favorites" />
            {sectionsOpen.favorites && (
              <div className="mt-0.5 space-y-px animate-in">
                {favorites.map((doc, i) => <DocItem key={doc.id} doc={doc} idx={documents.indexOf(doc)} />)}
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div>
          <SectionHeader label="Documents" sectionKey="docs" onAdd={() => {
            const id = `doc-${generateId()}`;
            addDocument({ id, title: 'Untitled', icon: '📄', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            setCurrentDoc(id);
          }} />
          {sectionsOpen.docs && (
            <div className="mt-0.5 space-y-px animate-in">
              {documents.map((doc, i) => <DocItem key={doc.id} doc={doc} idx={i} />)}
            </div>
          )}
        </div>

        {/* Agents */}
        <div>
          <SectionHeader label="Agents" sectionKey="agents" onAdd={() => setShowAddAgentModal(true)} />
          {sectionsOpen.agents && (
            <div className="mt-0.5 space-y-px animate-in">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => { setSelectedAgent(agent.id); setPanelView('agent-detail'); }}
                  className="w-full flex items-center gap-2.5 px-2 py-[5px] rounded-[4px] text-[14px] text-left text-text-secondary hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="relative shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: agent.color }}>
                      {getInitial(agent.name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${statusColor(agent.status)}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-[13px]">{agent.name}</span>
                    {agent.lastActivity && <span className="truncate text-[11px] text-text-tertiary">{agent.lastActivity}</span>}
                  </div>
                </button>
              ))}
              <button
                onClick={() => setShowAddAgentModal(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-tertiary hover:bg-surface-hover/60 hover:text-text-secondary transition-colors mt-0.5"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Add Agent</span>
              </button>
            </div>
          )}
        </div>

        {/* People */}
        <div>
          <SectionHeader label="People" sectionKey="people" />
          {sectionsOpen.people && (
            <div className="mt-0.5 space-y-px animate-in">
              {people.map((person) => (
                <div key={person.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm">
                  <div className="relative shrink-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: person.color }}>
                      {getInitial(person.name)}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${statusColor(person.status)}`} />
                  </div>
                  <span className="truncate text-text-secondary text-[13px]">{person.name}</span>
                </div>
              ))}
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-tertiary hover:bg-surface-hover/60 hover:text-text-secondary transition-colors mt-0.5"
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User / Sign out */}
      <UserFooter />

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] bg-surface border border-border rounded-lg shadow-2xl py-1 min-w-[180px] text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => startRename(contextMenu.docId)}
            className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2"
          >
            <IconFile className="w-3.5 h-3.5" /> Rename
          </button>
          <button
            onClick={() => { duplicateDocument(contextMenu.docId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2"
          >
            <IconCopy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button
            onClick={() => { toggleFavorite(contextMenu.docId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-2"
          >
            <IconStar className="w-3.5 h-3.5" />
            {documents.find((d) => d.id === contextMenu.docId)?.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </button>
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => { deleteDocument(contextMenu.docId); setContextMenu(null); }}
            className="w-full px-3 py-1.5 text-left text-danger hover:bg-danger/10 transition-colors flex items-center gap-2"
          >
            <IconTrash className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  return (
    <button
      onClick={toggleTheme}
      className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

function UserFooter() {
  const { user } = useUser();
  const { signOut } = useClerk();
  if (!user) return null;
  const initial = (user.fullName || user.firstName || 'U').charAt(0).toUpperCase();
  return (
    <div className="shrink-0 px-3 py-2 border-t border-border">
      <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors">
        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          {initial}
        </div>
        <span className="truncate text-[13px] text-text-secondary flex-1">{user.fullName || user.firstName || 'You'}</span>
        <button
          onClick={() => signOut({ redirectUrl: window.location.origin })}
          className="text-[11px] text-text-tertiary hover:text-danger transition-colors whitespace-nowrap"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
