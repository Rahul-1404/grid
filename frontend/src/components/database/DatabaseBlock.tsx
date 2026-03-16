import { useState, useCallback } from 'react';
import TableView from './TableView';
import KanbanBoard from './KanbanBoard';
import type { DatabaseItem, Status } from './TableView';

const INITIAL_ITEMS: DatabaseItem[] = [
  { id: '1', title: 'Write API documentation', status: 'In Progress', assignee: 'Claude', assigneeType: 'agent', priority: 'High', tags: ['docs'], createdAt: '2026-03-13T10:00:00Z', updatedAt: '2026-03-14T08:30:00Z' },
  { id: '2', title: 'Review PR #142', status: 'Done', assignee: 'Claude', assigneeType: 'agent', priority: 'Medium', tags: ['review'], createdAt: '2026-03-12T14:00:00Z', updatedAt: '2026-03-14T07:15:00Z' },
  { id: '3', title: 'Run integration tests', status: 'In Progress', assignee: 'Codex', assigneeType: 'agent', priority: 'High', tags: ['testing'], createdAt: '2026-03-13T09:00:00Z', updatedAt: '2026-03-14T09:00:00Z' },
  { id: '4', title: 'Research competitor features', status: 'Todo', assignee: 'Researcher', assigneeType: 'agent', priority: 'Medium', tags: ['research'], createdAt: '2026-03-11T16:00:00Z', updatedAt: '2026-03-13T12:00:00Z' },
  { id: '5', title: 'Fix auth token refresh bug', status: 'Backlog', priority: 'Critical', tags: ['bug', 'auth'], createdAt: '2026-03-10T11:00:00Z', updatedAt: '2026-03-12T15:00:00Z' },
  { id: '6', title: 'Draft landing page copy', status: 'Done', assignee: 'Claude', assigneeType: 'agent', priority: 'Low', tags: ['marketing'], createdAt: '2026-03-09T13:00:00Z', updatedAt: '2026-03-13T18:00:00Z' },
  { id: '7', title: 'Set up CI/CD pipeline', status: 'Todo', assignee: 'Codex', assigneeType: 'agent', priority: 'High', tags: ['infra'], createdAt: '2026-03-10T08:00:00Z', updatedAt: '2026-03-13T10:00:00Z' },
  { id: '8', title: 'Analyze user feedback', status: 'Backlog', assignee: 'Researcher', assigneeType: 'agent', priority: 'Medium', tags: ['research', 'ux'], createdAt: '2026-03-11T10:00:00Z', updatedAt: '2026-03-12T09:00:00Z' },
];

type View = 'table' | 'kanban';

interface DatabaseBlockProps {
  id?: string;
  onDelete?: () => void;
  title?: string;
  onTitleChange?: (title: string) => void;
}

export default function DatabaseBlock({ id, onDelete, title: controlledTitle, onTitleChange }: DatabaseBlockProps) {
  const [items, setItems] = useState<DatabaseItem[]>(INITIAL_ITEMS);
  const [view, setView] = useState<View>('table');
  const [filterStatus, setFilterStatus] = useState<Status | 'All'>('All');
  const [filterAssignee, setFilterAssignee] = useState('');

  const handleUpdate = useCallback((id: string, updates: Partial<DatabaseItem>) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates, updatedAt: updates.updatedAt || new Date().toISOString() } : item));
  }, []);

  const handleAdd = useCallback((status?: Status) => {
    const newItem: DatabaseItem = {
      id: String(Date.now()),
      title: 'Untitled',
      status: status || 'Todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const [dbTitleInternal, setDbTitleInternal] = useState('Agent Tasks');
  const dbTitle = controlledTitle ?? dbTitleInternal;
  const setDbTitle = (t: string) => {
    if (onTitleChange) onTitleChange(t);
    else setDbTitleInternal(t);
  };
  const [editingTitle, setEditingTitle] = useState(false);
  const uniqueAssignees = [...new Set(items.map(i => i.assignee).filter(Boolean))] as string[];

  return (
    <div className="my-6 rounded-xl border border-border overflow-hidden group/db bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {/* DB icon */}
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="2" width="14" height="12" rx="2" stroke="#8B5CF6" strokeWidth="1.5" fill="none" />
              <line x1="1" y1="6" x2="15" y2="6" stroke="#8B5CF6" strokeWidth="1.5" />
              <line x1="1" y1="10" x2="15" y2="10" stroke="#8B5CF6" strokeWidth="1.5" />
              <line x1="6" y1="6" x2="6" y2="14" stroke="#8B5CF6" strokeWidth="1.5" />
            </svg>
          </div>
          {editingTitle ? (
            <input
              autoFocus
              value={dbTitle}
              onChange={(e) => setDbTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
              className="text-sm font-semibold text-text-primary bg-transparent border-b border-accent outline-none"
            />
          ) : (
            <span
              className="text-sm font-semibold text-text-primary cursor-pointer hover:text-accent transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {dbTitle}
            </span>
          )}
          <span className="text-xs text-text-tertiary ml-1">{items.length} items</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Delete database */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover/db:opacity-100"
              title="Delete database"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
          {/* View switcher */}
          <button
            onClick={() => setView('table')}
            className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
            title="Table view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="1.5" y1="9.5" x2="14.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="6" y1="5.5" x2="6" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="11" y1="5.5" x2="11" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-surface-hover text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
            title="Kanban view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1.5" width="3.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="6.25" y="1.5" width="3.5" height="13" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="11.5" y="1.5" width="3.5" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter bar (table view only) */}
      {view === 'table' && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-surface-hover/30">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium">Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Status | 'All')}
              className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-secondary outline-none cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Backlog">Backlog</option>
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium">Assignee</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-surface border border-border rounded-md px-2 py-1 text-xs text-text-secondary outline-none cursor-pointer"
            >
              <option value="">All</option>
              {uniqueAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {(filterStatus !== 'All' || filterAssignee) && (
            <button
              onClick={() => { setFilterStatus('All'); setFilterAssignee(''); }}
              className="text-xs text-accent hover:text-accent-hover transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {view === 'table' ? (
          <TableView
            items={items}
            onUpdate={handleUpdate}
            onAdd={() => handleAdd()}
            filterStatus={filterStatus}
            filterAssignee={filterAssignee}
          />
        ) : (
          <KanbanBoard
            items={items}
            onUpdate={handleUpdate}
            onAdd={(status) => handleAdd(status)}
          />
        )}
      </div>
    </div>
  );
}
