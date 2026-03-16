import { useState, useRef, useCallback } from 'react';
import type { DatabaseItem, Status, Priority } from './TableView';

const STATUS_ORDER: Status[] = ['Backlog', 'Todo', 'In Progress', 'Done'];

const COLUMN_COLORS: Record<Status, { bg: string; border: string; text: string; dot: string }> = {
  Backlog: { bg: 'rgba(110,110,122,0.06)', border: 'rgba(110,110,122,0.2)', text: '#9898A4', dot: '#6E6E7A' },
  Todo: { bg: 'rgba(59,130,246,0.04)', border: 'rgba(59,130,246,0.15)', text: '#60A5FA', dot: '#3B82F6' },
  'In Progress': { bg: 'rgba(234,179,8,0.04)', border: 'rgba(234,179,8,0.15)', text: '#FACC15', dot: '#EAB308' },
  Done: { bg: 'rgba(34,197,94,0.04)', border: 'rgba(34,197,94,0.15)', text: '#4ADE80', dot: '#22C55E' },
};

const PRIORITY_DOT: Record<Priority, string> = {
  Low: '#6E6E7A',
  Medium: '#3B82F6',
  High: '#EAB308',
  Critical: '#EF4444',
};

interface Props {
  items: DatabaseItem[];
  onUpdate: (id: string, updates: Partial<DatabaseItem>) => void;
  onAdd: (status: Status) => void;
}

function KanbanCard({ item, onDragStart }: { item: DatabaseItem; onDragStart: (e: React.DragEvent, id: string) => void }) {
  const isAgent = item.assigneeType === 'agent';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className="rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-all duration-150 hover:translate-y-[-2px] hover:shadow-lg group bg-surface border border-border"
      style={{
        borderLeft: isAgent ? '3px solid rgba(139,92,246,0.5)' : undefined,
      }}
    >
      {/* Title */}
      <div className="text-[13px] text-text-primary font-medium mb-3 leading-snug">{item.title}</div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-text-tertiary border border-border/50">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: assignee + priority */}
      <div className="flex items-center justify-between">
        {item.assignee ? (
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: isAgent ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)',
                color: isAgent ? '#A78BFA' : '#60A5FA',
              }}
            >
              {item.assignee[0]}
            </div>
            <span className="text-[11px] text-text-tertiary">{item.assignee}</span>
          </div>
        ) : (
          <span className="text-[11px] text-text-tertiary italic">Unassigned</span>
        )}
        {item.priority && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_DOT[item.priority] }} />
            <span className="text-[10px] text-text-tertiary">{item.priority}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ items, onUpdate, onAdd }: Props) {
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);
  const dragItemId = useRef<string | null>(null);

  const handleDragStart = useCallback((_e: React.DragEvent, id: string) => {
    dragItemId.current = id;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: Status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: Status) => {
    e.preventDefault();
    setDragOverCol(null);
    if (dragItemId.current) {
      onUpdate(dragItemId.current, { status, updatedAt: new Date().toISOString() });
      dragItemId.current = null;
    }
  }, [onUpdate]);

  return (
    <div className="grid grid-cols-4 gap-3 min-h-[300px]">
      {STATUS_ORDER.map((status) => {
        const colItems = items.filter((i) => i.status === status);
        const isOver = dragOverCol === status;
        const colors = COLUMN_COLORS[status];

        return (
          <div
            key={status}
            className="flex flex-col rounded-lg transition-colors duration-150"
            style={{
              background: isOver ? colors.bg : 'transparent',
              border: isOver ? `1px dashed ${colors.border}` : '1px solid transparent',
            }}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: colors.dot }} />
                <span className="text-[13px] font-semibold" style={{ color: colors.text }}>{status}</span>
              </div>
              <span className="text-[11px] text-text-tertiary bg-surface-hover px-1.5 py-0.5 rounded font-medium">
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 px-1">
              {colItems.map((item) => (
                <KanbanCard key={item.id} item={item} onDragStart={handleDragStart} />
              ))}
            </div>

            {/* Add card */}
            <button
              onClick={() => onAdd(status)}
              className="flex items-center gap-1 px-3 py-2 mt-2 rounded-lg text-[12px] text-text-tertiary hover:text-text-secondary hover:bg-surface-hover/30 transition-colors mx-1 mb-1"
            >
              <span className="text-sm">+</span> Add
            </button>
          </div>
        );
      })}
    </div>
  );
}
