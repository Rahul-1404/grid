import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { DocProperty } from '../../types';
import { IconPlus } from '../../lib/icons';

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  'bg-green-500/15 text-green-600 dark:text-green-400',
  'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'bg-red-500/15 text-red-600 dark:text-red-400',
  'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  'bg-orange-500/15 text-orange-600 dark:text-orange-400',
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-surface-hover text-text-secondary',
  'In Review': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Published: 'bg-green-500/15 text-green-600 dark:text-green-400',
  Archived: 'bg-red-500/15 text-red-600 dark:text-red-400',
  Low: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  Medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  High: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  Critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

// SVG icons matching Notion's subtle style
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5" />
      <path d="M2 6.5h12" />
      <path d="M5.5 1.5v3" />
      <path d="M10.5 1.5v3" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4" />
    </svg>
  );
}

function CircleDotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8.5V3a1 1 0 011-1h5.5L14 7.5 8.5 13z" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h10" />
      <path d="M8 3v10" />
      <path d="M5 13h6" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 9.5a3 3 0 004 .5l2-2a3 3 0 00-4.25-4.25L7 5" />
      <path d="M9.5 6.5a3 3 0 00-4-.5l-2 2a3 3 0 004.25 4.25L9 11" />
    </svg>
  );
}

function CheckboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      <path d="M5 8l2 2 4-4" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M4 6h9M3 10h9M6.5 3l-1 10M10.5 3l-1 10" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5s2.5 3 2.5 5.5a4 4 0 01-1.5 3c.5-1 0-2.5-1-3-.5 1.5-1.5 2-2.5 2.5A4 4 0 014 8c0-2 1.5-3.5 2-4 .3.8 1 1.5 2-2.5z" />
    </svg>
  );
}

type PropIconComponent = ({ className }: { className?: string }) => React.ReactElement;

const PROP_ICON_MAP: Record<string, PropIconComponent> = {
  tags: TagIcon,
  status: CircleDotIcon,
  author: UserIcon,
  assignee: UserIcon,
  person: UserIcon,
  date: CalendarIcon,
  'last reviewed': CalendarIcon,
  created: CalendarIcon,
  due: CalendarIcon,
  priority: FireIcon,
  text: TextIcon,
  url: LinkIcon,
  link: LinkIcon,
  checkbox: CheckboxIcon,
  number: HashIcon,
};

function getPropIconComponent(name: string, type: string): PropIconComponent {
  const lower = name.toLowerCase();
  return PROP_ICON_MAP[lower] || PROP_ICON_MAP[type] || TextIcon;
}

// Dropdown for property name actions
function PropertyNameMenu({
  prop,
  onClose,
  onRename,
  onDelete,
}: {
  prop: DocProperty;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
    >
      <button
        onClick={onRename}
        className="w-full text-left px-3 py-1.5 text-[13px] text-text-primary hover:bg-surface-hover transition-colors"
      >
        Rename
      </button>
      <button
        className="w-full text-left px-3 py-1.5 text-[13px] text-text-primary hover:bg-surface-hover transition-colors"
        onClick={onClose}
      >
        Edit property
      </button>
      <div className="h-px bg-border my-1" />
      <button
        onClick={onDelete}
        className="w-full text-left px-3 py-1.5 text-[13px] text-red-500 hover:bg-surface-hover transition-colors"
      >
        Delete property
      </button>
    </div>
  );
}

function PropertyValue({ prop, onChange }: { prop: DocProperty & { _parentName?: string }; onChange: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [dateEditing, setDateEditing] = useState(false);

  if (prop.type === 'select') {
    const val = prop.value as string;
    return (
      <div className="relative">
        <button
          onClick={() => setSelectOpen(!selectOpen)}
          className={`px-2 py-0.5 rounded text-[13px] transition-colors ${
            val ? (STATUS_COLORS[val] || 'bg-surface-hover text-text-primary') : ''
          }`}
        >
          {val || <span className="text-text-tertiary">Empty</span>}
        </button>
        {selectOpen && (
          <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-md shadow-lg py-1 z-50 min-w-[150px]">
            {(prop.options || []).map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setSelectOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[13px] hover:bg-surface-hover transition-colors flex items-center gap-2 ${
                  val === opt ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[opt]?.split(' ')[0] || 'bg-text-tertiary'}`} />
                {opt}
                {val === opt && <span className="ml-auto text-accent">&#10003;</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (prop.type === 'checkbox') {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={prop.value as boolean}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-4 h-4 rounded border border-border peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center transition-colors">
          {(prop.value as boolean) && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </label>
    );
  }

  if (prop.type === 'date') {
    const dateVal = prop.value as string;

    if (!dateVal && !dateEditing) {
      return (
        <button
          onClick={() => setDateEditing(true)}
          className="text-[14px] text-text-tertiary hover:bg-surface-hover rounded px-1.5 py-0.5 transition-colors"
        >
          Empty
        </button>
      );
    }

    return (
      <input
        type="date"
        autoFocus={dateEditing}
        value={dateVal || ''}
        onChange={(e) => { onChange(e.target.value); setDateEditing(false); }}
        onBlur={() => setDateEditing(false)}
        className="bg-transparent text-[14px] text-text-primary border-none outline-none hover:bg-surface-hover rounded px-1.5 py-0.5 cursor-pointer transition-colors"
      />
    );
  }

  if (prop.type === 'person') {
    return (
      <div className="flex items-center gap-2">
        {(prop.value as string) ? (
          <>
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-medium text-accent">
              {(prop.value as string)[0]?.toUpperCase()}
            </div>
            <span className="text-[14px] text-text-primary">{prop.value as string}</span>
          </>
        ) : (
          <span className="text-[14px] text-text-tertiary">Empty</span>
        )}
      </div>
    );
  }

  if (prop.type === 'url') {
    return editing ? (
      <input
        autoFocus
        value={(prop.value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
        className="bg-transparent text-[14px] text-text-primary border-b border-accent outline-none w-full max-w-[220px]"
        placeholder="https://..."
      />
    ) : (
      <button
        onClick={() => setEditing(true)}
        className="text-[14px] text-text-primary hover:underline truncate max-w-[220px]"
      >
        {(prop.value as string) || <span className="text-text-tertiary no-underline">Empty</span>}
      </button>
    );
  }

  if (prop.type === 'number') {
    const name = prop._parentName?.toLowerCase?.() || '';
    const isProgress = name === 'progress' || name === 'completion';
    const numVal = (prop.value as number) ?? 0;

    if (isProgress || (numVal >= 0 && numVal <= 100 && name.includes('progress'))) {
      return (
        <div className="flex items-center gap-2 flex-1 max-w-[220px]">
          <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, numVal))}%` }}
            />
          </div>
          <span className="text-[12px] text-text-tertiary w-8 text-right">{numVal}%</span>
        </div>
      );
    }

    return (
      <input
        type="number"
        value={numVal}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="bg-transparent text-[14px] text-text-primary border-none outline-none hover:bg-surface-hover rounded px-1.5 py-0.5 w-20 transition-colors"
      />
    );
  }

  // text
  return editing ? (
    <input
      autoFocus
      value={(prop.value as string) || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
      className="bg-transparent text-[14px] text-text-primary border-b border-accent outline-none w-full max-w-[220px]"
    />
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="text-[14px] text-text-primary hover:bg-surface-hover rounded px-1.5 py-0.5 transition-colors"
    >
      {(prop.value as string) || <span className="text-text-tertiary">Empty</span>}
    </button>
  );
}

export default function DocInfo({ docId }: { docId: string }) {
  const { updateDocTags, updateDocProperty, addDocProperty, removeDocProperty, workspaces, currentWorkspaceId } = useWorkspaceStore();
  const documents = (workspaces.find((w) => w.id === currentWorkspaceId)?.documents ?? []);
  const [tagInput, setTagInput] = useState('');
  const [showAddProp, setShowAddProp] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<DocProperty['type']>('text');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [renamingProp, setRenamingProp] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const doc = documents.find((d) => d.id === docId);
  if (!doc) return null;

  const tags = doc.tags || [];
  const properties = doc.properties || [];

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      updateDocTags(docId, [...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    updateDocTags(docId, tags.filter((t) => t !== tag));
  };

  const handleAddProperty = () => {
    if (!newPropName.trim()) return;
    const prop: DocProperty = {
      id: `p-${Math.random().toString(36).slice(2, 8)}`,
      name: newPropName.trim(),
      type: newPropType,
      value: newPropType === 'checkbox' ? false : newPropType === 'select' ? '' : newPropType === 'number' ? 0 : '',
      options: newPropType === 'select' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    };
    addDocProperty(docId, prop);
    setNewPropName('');
    setShowAddProp(false);
  };

  const handleRename = (propId: string, newName: string) => {
    if (!newName.trim()) return;
    // Find the property and update it with the new name
    const prop = properties.find((p) => p.id === propId);
    if (prop) {
      // We update via removeDocProperty + addDocProperty to rename
      // But since there's no dedicated rename, we update the value to trigger a re-render
      // For now, we'll use updateDocProperty with special handling
      removeDocProperty(docId, propId);
      addDocProperty(docId, { ...prop, name: newName.trim() });
    }
    setRenamingProp(null);
  };

  return (
    <div className="mb-2">
      {/* Tags row */}
      <div className="flex items-center min-h-[28px] group/row hover:bg-surface-hover/50 rounded transition-colors -mx-1 px-1">
        <div className="flex items-center gap-1.5 w-[140px] shrink-0">
          <TagIcon className="w-4 h-4 text-text-tertiary" />
          <span className="text-[14px] text-text-secondary">Tags</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {tags.length === 0 && !tagInput && (
            <span className="text-[14px] text-text-tertiary">Empty</span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[12px] font-medium ${getTagColor(tag)} cursor-default group/tag`}
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="opacity-0 group-hover/tag:opacity-100 hover:text-current transition-opacity ml-0.5 text-[10px] leading-none"
              >
                &times;
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag();
              if (e.key === 'Backspace' && !tagInput && tags.length) {
                handleRemoveTag(tags[tags.length - 1]);
              }
            }}
            placeholder={tags.length ? '' : 'Add tag...'}
            className="bg-transparent text-[13px] text-text-primary outline-none w-16 placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Properties */}
      {properties.map((prop) => {
        const Icon = getPropIconComponent(prop.name, prop.type);
        return (
          <div
            key={prop.id}
            className="flex items-center min-h-[28px] group/row hover:bg-surface-hover/50 rounded transition-colors -mx-1 px-1"
          >
            <div className="flex items-center gap-1.5 w-[140px] shrink-0 relative">
              <Icon className="w-4 h-4 text-text-tertiary" />
              {renamingProp === prop.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => { handleRename(prop.id, renameValue); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(prop.id, renameValue);
                    if (e.key === 'Escape') setRenamingProp(null);
                  }}
                  className="text-[14px] text-text-secondary bg-transparent border-b border-accent outline-none w-full max-w-[100px]"
                />
              ) : (
                <button
                  onClick={() => setMenuOpenFor(menuOpenFor === prop.id ? null : prop.id)}
                  className="text-[14px] text-text-secondary truncate text-left hover:text-text-primary transition-colors"
                >
                  {prop.name}
                </button>
              )}
              {menuOpenFor === prop.id && (
                <PropertyNameMenu
                  prop={prop}
                  onClose={() => setMenuOpenFor(null)}
                  onRename={() => {
                    setRenameValue(prop.name);
                    setRenamingProp(prop.id);
                    setMenuOpenFor(null);
                  }}
                  onDelete={() => {
                    removeDocProperty(docId, prop.id);
                    setMenuOpenFor(null);
                  }}
                />
              )}
            </div>
            <div className="flex-1 flex items-center">
              <PropertyValue
                prop={{ ...prop, _parentName: prop.name } as DocProperty & { _parentName?: string }}
                onChange={(value) => updateDocProperty(docId, prop.id, value)}
              />
            </div>
          </div>
        );
      })}

      {/* Add property */}
      {showAddProp ? (
        <div className="flex items-center min-h-[28px] -mx-1 px-1 gap-2 pl-6">
          <input
            autoFocus
            value={newPropName}
            onChange={(e) => setNewPropName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddProperty();
              if (e.key === 'Escape') setShowAddProp(false);
            }}
            placeholder="Property name"
            className="bg-transparent text-[14px] text-text-primary border-b border-border outline-none focus:border-accent w-24"
          />
          <select
            value={newPropType}
            onChange={(e) => setNewPropType(e.target.value as DocProperty['type'])}
            className="bg-surface text-[13px] text-text-secondary border border-border rounded px-2 py-0.5 outline-none"
          >
            <option value="text">Text</option>
            <option value="select">Select</option>
            <option value="date">Date</option>
            <option value="person">Person</option>
            <option value="checkbox">Checkbox</option>
            <option value="number">Number</option>
            <option value="url">URL</option>
          </select>
          <button onClick={handleAddProperty} className="text-[13px] text-accent hover:underline">Add</button>
          <button onClick={() => setShowAddProp(false)} className="text-[13px] text-text-tertiary hover:text-text-secondary">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddProp(true)}
          className="flex items-center gap-1.5 text-[14px] text-text-tertiary hover:text-text-secondary transition-colors min-h-[28px] -mx-1 px-1 pl-6 w-full rounded hover:bg-surface-hover/50"
        >
          <IconPlus className="w-3.5 h-3.5" />
          Add a property
        </button>
      )}
    </div>
  );
}
