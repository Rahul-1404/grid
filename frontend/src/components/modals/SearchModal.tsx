import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWorkspaceStore, selectDocuments } from '../../stores/workspaceStore';
import { IconSearch, IconFile } from '../../lib/icons';

interface SearchResult {
  docId: string;
  title: string;
  icon?: string;
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
}

export default function SearchModal() {
  const { setCurrentDoc, setSearchOpen, switchWorkspace, workspaces, currentWorkspaceId } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search across ALL workspaces
  const allDocs = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    for (const ws of workspaces) {
      for (const doc of ws.documents) {
        results.push({
          docId: doc.id,
          title: doc.title,
          icon: doc.icon,
          updatedAt: doc.updatedAt,
          workspaceId: ws.id,
          workspaceName: ws.name,
        });
      }
    }
    return results;
  }, [workspaces]);

  const filtered = allDocs.filter((d) =>
    d.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const selectDoc = useCallback((doc: SearchResult) => {
    if (doc.workspaceId !== currentWorkspaceId) {
      switchWorkspace(doc.workspaceId);
    }
    // Small delay to let workspace switch propagate, then set doc
    setTimeout(() => setCurrentDoc(doc.docId), 0);
    setSearchOpen(false);
  }, [currentWorkspaceId, switchWorkspace, setCurrentDoc, setSearchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && filtered[selected]) {
        selectDoc(filtered[selected]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selected, setSearchOpen, selectDoc]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <IconSearch className="w-5 h-5 text-text-tertiary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search all documents..."
            className="flex-1 bg-transparent text-text-primary outline-none text-sm placeholder:text-text-tertiary"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-tertiary font-mono">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-tertiary">No documents found</div>
          ) : (
            filtered.map((doc, i) => (
              <button
                key={doc.docId}
                onClick={() => selectDoc(doc)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selected ? 'bg-surface-hover' : ''
                }`}
              >
                <span className="text-lg">{doc.icon || '📄'}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text-primary">{doc.title}</div>
                  <div className="text-xs text-text-tertiary flex items-center gap-1.5">
                    {doc.workspaceId !== currentWorkspaceId && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-hover text-text-tertiary">{doc.workspaceName}</span>
                    )}
                    <span>Edited {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
