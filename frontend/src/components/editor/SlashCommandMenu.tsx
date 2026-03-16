import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface SlashCommandMenuProps {
  editor: Editor;
  pos: { top: number; left: number };
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  desc: string;
  icon: string;
  iconBg: string;
  category: string;
}

const commands: CommandItem[] = [
  // Basic Blocks
  { id: 'text', label: 'Text', desc: 'Just start writing with plain text.', icon: 'Aa', iconBg: 'bg-surface-hover', category: 'Basic Blocks' },
  { id: 'h1', label: 'Heading 1', desc: 'Big section heading.', icon: 'H1', iconBg: 'bg-accent/10', category: 'Basic Blocks' },
  { id: 'h2', label: 'Heading 2', desc: 'Medium section heading.', icon: 'H2', iconBg: 'bg-accent/10', category: 'Basic Blocks' },
  { id: 'h3', label: 'Heading 3', desc: 'Small section heading.', icon: 'H3', iconBg: 'bg-accent/10', category: 'Basic Blocks' },
  { id: 'bullet', label: 'Bullet List', desc: 'Create a simple bulleted list.', icon: '•', iconBg: 'bg-amber-500/10', category: 'Basic Blocks' },
  { id: 'ordered', label: 'Numbered List', desc: 'Create a list with numbering.', icon: '1.', iconBg: 'bg-amber-500/10', category: 'Basic Blocks' },
  { id: 'task', label: 'To-do List', desc: 'Track tasks with a checklist.', icon: '☑', iconBg: 'bg-online/10', category: 'Basic Blocks' },
  { id: 'toggle', label: 'Toggle List', desc: 'Toggles can hide and show content.', icon: '▶', iconBg: 'bg-surface-hover', category: 'Basic Blocks' },
  { id: 'quote', label: 'Quote', desc: 'Capture a quote.', icon: '"', iconBg: 'bg-agent/10', category: 'Basic Blocks' },
  { id: 'divider', label: 'Divider', desc: 'Visually divide blocks.', icon: '—', iconBg: 'bg-surface-hover', category: 'Basic Blocks' },
  { id: 'callout-info', label: 'Callout', desc: 'Make writing stand out.', icon: '💡', iconBg: 'bg-accent/10', category: 'Basic Blocks' },
  // Media
  { id: 'image', label: 'Image', desc: 'Upload or embed with a link.', icon: '🖼', iconBg: 'bg-amber-500/10', category: 'Media' },
  { id: 'code', label: 'Code', desc: 'Capture a code snippet.', icon: '</>', iconBg: 'bg-online/10', category: 'Media' },
  // Advanced
  { id: 'table', label: 'Table', desc: 'Add a simple table.', icon: '▦', iconBg: 'bg-online/10', category: 'Advanced' },
  { id: 'callout-warning', label: 'Warning', desc: 'Highlight important warnings.', icon: '⚠️', iconBg: 'bg-amber-500/10', category: 'Advanced' },
  { id: 'callout-danger', label: 'Danger', desc: 'Highlight critical issues.', icon: '🔴', iconBg: 'bg-danger/10', category: 'Advanced' },
  { id: 'callout-success', label: 'Success', desc: 'Highlight positive outcomes.', icon: '✅', iconBg: 'bg-online/10', category: 'Advanced' },
  { id: 'callout-tip', label: 'Tip', desc: 'Share helpful tips.', icon: '🔥', iconBg: 'bg-agent/10', category: 'Advanced' },
  { id: 'database', label: 'Database', desc: 'Table & Kanban views.', icon: '▦', iconBg: 'bg-agent/10', category: 'Advanced' },
];

const categories = ['Basic Blocks', 'Media', 'Advanced'];

export default function SlashCommandMenu({ editor, pos, onClose }: SlashCommandMenuProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filtered = commands.filter(
    (c) =>
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.desc.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  // Build flat index for keyboard nav
  const flatItems: CommandItem[] = [];
  const usedCategories: string[] = [];
  for (const cat of categories) {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length > 0) {
      usedCategories.push(cat);
      flatItems.push(...items);
    }
  }

  const execute = useCallback(
    (id: string) => {
      // Delete the slash + query
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 40), from, '\n');
      const slashIdx = textBefore.lastIndexOf('/');
      if (slashIdx >= 0) {
        const deleteFrom = from - (textBefore.length - slashIdx);
        editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run();
      }

      const calloutTypes: Record<string, { icon: string; bg: string; border: string }> = {
        'callout-info': { icon: '💡', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
        'callout-warning': { icon: '⚠️', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)' },
        'callout-danger': { icon: '🔴', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
        'callout-success': { icon: '✅', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
        'callout-tip': { icon: '🔥', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
      };

      switch (id) {
        case 'text':
          editor.chain().focus().setParagraph().run();
          break;
        case 'h1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'h2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'h3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bullet':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'ordered':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'task':
          editor.chain().focus().toggleTaskList().run();
          break;
        case 'toggle':
          editor.chain().focus().insertContent(
            '<details class="toggle-block"><summary>Toggle heading</summary><p>Hidden content here...</p></details>'
          ).run();
          break;
        case 'code':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'quote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'table':
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case 'divider':
          editor.chain().focus().setHorizontalRule().run();
          break;
        case 'image': {
          const url = prompt('Image URL:');
          if (url) editor.chain().focus().setImage({ src: url }).run();
          break;
        }
        case 'database':
          editor.chain().focus().insertContent({ type: 'databaseBlock', attrs: { title: 'Agent Tasks' } }).run();
          break;
        default:
          if (id.startsWith('callout-')) {
            const ct = calloutTypes[id] || calloutTypes['callout-info'];
            editor.chain().focus().insertContent(
              `<div class="callout" data-callout-type="${id.replace('callout-', '')}" style="background:${ct.bg};border-color:${ct.border}"><span class="callout-icon">${ct.icon}</span><p>Type something...</p></div>`
            ).run();
          }
      }
      onClose();
    },
    [editor, onClose]
  );

  // Scroll selected into view
  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, flatItems.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (flatItems[selected]) execute(flatItems[selected].id); return; }
      if (e.key === 'Backspace' && query === '') { onClose(); return; }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        setQuery((q) => q + e.key);
        setSelected(0);
      } else if (e.key === 'Backspace') {
        setQuery((q) => q.slice(0, -1));
        setSelected(0);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [query, selected, flatItems, execute, onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position adjustment to stay on screen
  const adjustedTop = Math.min(pos.top, window.innerHeight - 420);
  const adjustedLeft = Math.min(pos.left, window.innerWidth - 340);

  let flatIdx = 0;

  return (
    <div
      ref={menuRef}
      className="slash-menu-root fixed z-50"
      style={{ top: adjustedTop, left: adjustedLeft }}
    >
      {/* Search indicator */}
      {query && (
        <div className="px-3 py-2 border-b border-border text-sm text-text-tertiary flex items-center gap-2">
          <span className="text-text-secondary">/</span>
          <span className="text-text-primary">{query}</span>
        </div>
      )}

      {flatItems.length === 0 ? (
        <div className="px-4 py-8 text-sm text-text-tertiary text-center">No results</div>
      ) : (
        <div className="py-1 max-h-[380px] overflow-y-auto">
          {usedCategories.map((cat) => {
            const items = filtered.filter((c) => c.category === cat);
            return (
              <div key={cat}>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {cat}
                </div>
                {items.map((cmd) => {
                  const currentIdx = flatIdx++;
                  const isSelected = currentIdx === selected;
                  return (
                    <div
                      key={cmd.id}
                      ref={(el) => { itemRefs.current[currentIdx] = el; }}
                      className={`flex items-center gap-3 px-3 py-2 mx-1 rounded-lg cursor-pointer transition-all duration-100 ${
                        isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover/50'
                      }`}
                      onMouseEnter={() => setSelected(currentIdx)}
                      onClick={() => execute(cmd.id)}
                    >
                      <div className={`w-10 h-10 rounded-lg ${cmd.iconBg} flex items-center justify-center text-base shrink-0 border border-border/50`}>
                        {cmd.icon.length <= 3 ? (
                          <span className="text-text-primary font-semibold text-sm">{cmd.icon}</span>
                        ) : (
                          <span>{cmd.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary font-medium">{cmd.label}</div>
                        <div className="text-xs text-text-tertiary truncate">{cmd.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
