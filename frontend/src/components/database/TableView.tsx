import { useState, useRef, useEffect } from 'react';

export type Status = 'Backlog' | 'Todo' | 'In Progress' | 'Done';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface DatabaseItem {
  id: string;
  title: string;
  status: Status;
  assignee?: string;
  assigneeType?: 'human' | 'agent';
  priority?: Priority;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

type SortField = 'title' | 'status' | 'assignee' | 'priority' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<Status, { bg: string; text: string; dot: string }> = {
  Backlog: { bg: 'rgba(110,110,122,0.15)', text: '#8E8E9A', dot: '#6E6E7A' },
  Todo: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', dot: '#3B82F6' },
  'In Progress': { bg: 'rgba(234,179,8,0.15)', text: '#FACC15', dot: '#EAB308' },
  Done: { bg: 'rgba(34,197,94,0.15)', text: '#4ADE80', dot: '#22C55E' },
};

const PRIORITY_COLORS: Record<Priority, string> = {
  Low: '#6E6E7A',
  Medium: '#3B82F6',
  High: '#EAB308',
  Critical: '#EF4444',
};

const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Done'];
const PRIORITY_ORDER: Priority[] = ['Low', 'Medium', 'High', 'Critical'];

interface Props {
  items: DatabaseItem[];
  onUpdate: (id: string, updates: Partial<DatabaseItem>) => void;
  onAdd: () => void;
  filterStatus: Status | 'All';
  filterAssignee: string;
}

function Avatar({ name, isAgent }: { name: string; isAgent: boolean }) {
  const letter = name.charAt(0).toUpperCase();
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
      style={{
        background: isAgent ? 'rgba(139,92,246,0.25)' : 'rgba(59,130,246,0.25)',
        color: isAgent ? '#A78BFA' : '#60A5FA',
      }}
    >
      {letter}
    </div>
  );
}

function InlineEdit({ value, onSave, className }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (!editing) {
    return (
      <span className={`cursor-pointer ${className || ''}`} onClick={() => { setDraft(value); setEditing(true); }}>
        {value || <span className="text-text-tertiary italic">Empty</span>}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
      className="bg-transparent border border-border-light rounded px-1 py-0.5 text-sm text-text-primary outline-none w-full"
    />
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const c = STATUS_COLORS[value];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
        style={{ background: c.bg, color: c.text }}
      >
        {value}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-2xl z-50 py-1 min-w-[140px]">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s].dot }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PrioritySelect({ value, onChange }: { value?: Priority; onChange: (p: Priority) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
        {value ? (
          <>
            <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[value] }} />
            {value}
          </>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-2xl z-50 py-1 min-w-[120px]">
          {PRIORITY_ORDER.map((p) => (
            <button
              key={p}
              onClick={() => { onChange(p); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ASSIGNEE_OPTIONS = [
  { name: 'Claude', type: 'agent' as const },
  { name: 'Codex', type: 'agent' as const },
  { name: 'Researcher', type: 'agent' as const },
  { name: 'You', type: 'human' as const },
];

function AssigneeSelect({ value, assigneeType, onChange }: { value?: string; assigneeType?: 'human' | 'agent'; onChange: (name: string, type: 'human' | 'agent') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 hover:bg-surface-hover/50 rounded-md px-1 py-0.5 -mx-1 transition-colors">
        {value ? (
          <>
            <Avatar name={value} isAgent={assigneeType === 'agent'} />
            <span className={`text-sm ${assigneeType === 'agent' ? 'text-agent' : 'text-text-secondary'}`}>{value}</span>
          </>
        ) : (
          <span className="text-sm text-text-tertiary">—</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-2xl z-50 py-1 min-w-[160px]">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Agents</div>
          {ASSIGNEE_OPTIONS.filter(a => a.type === 'agent').map((a) => (
            <button
              key={a.name}
              onClick={() => { onChange(a.name, a.type); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors ${value === a.name ? 'text-text-primary' : 'text-text-secondary'}`}
            >
              <Avatar name={a.name} isAgent={true} />
              {a.name}
              {value === a.name && <span className="ml-auto text-accent text-xs">✓</span>}
            </button>
          ))}
          <div className="h-px bg-border my-1" />
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">People</div>
          {ASSIGNEE_OPTIONS.filter(a => a.type === 'human').map((a) => (
            <button
              key={a.name}
              onClick={() => { onChange(a.name, a.type); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors ${value === a.name ? 'text-text-primary' : 'text-text-secondary'}`}
            >
              <Avatar name={a.name} isAgent={false} />
              {a.name}
              {value === a.name && <span className="ml-auto text-accent text-xs">✓</span>}
            </button>
          ))}
          {value && (
            <>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => { onChange('', 'human'); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text-tertiary hover:bg-surface-hover transition-colors"
              >
                Unassign
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgoShort(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function TableView({ items, onUpdate, onAdd, filterStatus, filterAssignee }: Props) {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  let filtered = items;
  if (filterStatus !== 'All') filtered = filtered.filter(i => i.status === filterStatus);
  if (filterAssignee) filtered = filtered.filter(i => i.assignee?.toLowerCase().includes(filterAssignee.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'title': return dir * a.title.localeCompare(b.title);
      case 'status': return dir * (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
      case 'assignee': return dir * (a.assignee || '').localeCompare(b.assignee || '');
      case 'priority': return dir * ((a.priority ? PRIORITY_ORDER.indexOf(a.priority) : -1) - (b.priority ? PRIORITY_ORDER.indexOf(b.priority) : -1));
      case 'updatedAt': return dir * (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      default: return 0;
    }
  });

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th
      onClick={() => toggleSort(field)}
      className={`px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors select-none ${className || ''}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-text-secondary">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <SortHeader field="title" label="Title" className="min-w-[200px]" />
            <SortHeader field="status" label="Status" />
            <SortHeader field="assignee" label="Assignee" />
            <SortHeader field="priority" label="Priority" />
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">Tags</th>
            <SortHeader field="updatedAt" label="Updated" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={item.id} className="border-b border-border/50 hover:bg-surface-hover/30 transition-colors group">
              <td className="px-3 py-2.5">
                <InlineEdit
                  value={item.title}
                  onSave={(v) => onUpdate(item.id, { title: v })}
                  className="text-sm text-text-primary font-medium"
                />
              </td>
              <td className="px-3 py-2.5">
                <StatusSelect value={item.status} onChange={(s) => onUpdate(item.id, { status: s, updatedAt: new Date().toISOString() })} />
              </td>
              <td className="px-3 py-2.5">
                <AssigneeSelect
                  value={item.assignee}
                  assigneeType={item.assigneeType}
                  onChange={(name, type) => onUpdate(item.id, { assignee: name || undefined, assigneeType: name ? type : undefined, updatedAt: new Date().toISOString() })}
                />
              </td>
              <td className="px-3 py-2.5">
                <PrioritySelect value={item.priority} onChange={(p) => onUpdate(item.id, { priority: p, updatedAt: new Date().toISOString() })} />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1 flex-wrap">
                  {item.tags?.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-hover text-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-sm text-text-tertiary">
                {timeAgoShort(item.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row */}
      <button
        onClick={onAdd}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-text-tertiary hover:text-text-secondary hover:bg-surface-hover/30 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        New
      </button>
    </div>
  );
}
