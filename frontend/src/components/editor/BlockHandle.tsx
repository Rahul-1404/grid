import { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { IconPlus, IconTrash, IconCopy } from '../../lib/icons';

interface BlockHandleProps {
  editor: Editor;
  onSlashMenu: (pos: { top: number; left: number }) => void;
}

export default function BlockHandle({ editor, onSlashMenu }: BlockHandleProps) {
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number; nodePos: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editorEl = editor.view.dom;

    const handleMouseMove = (e: MouseEvent) => {
      if (menuOpen) return;
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!pos) { setHoverPos(null); return; }

      const resolved = editor.state.doc.resolve(pos.pos);
      // Get the top-level node position
      const depth = resolved.depth;
      if (depth === 0) { setHoverPos(null); return; }
      const nodePos = resolved.before(1);
      const node = editor.state.doc.nodeAt(nodePos);
      if (!node) { setHoverPos(null); return; }

      const dom = editor.view.nodeDOM(nodePos) as HTMLElement;
      if (!dom) { setHoverPos(null); return; }

      const rect = dom.getBoundingClientRect();
      const editorRect = editorEl.closest('.editor-scroll-container')?.getBoundingClientRect();
      if (!editorRect) { setHoverPos(null); return; }

      setHoverPos({
        top: rect.top,
        left: editorRect.left + 8,
        nodePos,
      });
    };

    const handleMouseLeave = () => {
      if (!menuOpen) setHoverPos(null);
    };

    editorEl.addEventListener('mousemove', handleMouseMove);
    editorEl.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      editorEl.removeEventListener('mousemove', handleMouseMove);
      editorEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editor, menuOpen]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  if (!hoverPos) return null;

  const handleDelete = () => {
    const node = editor.state.doc.nodeAt(hoverPos.nodePos);
    if (node) {
      editor.chain().focus().deleteRange({ from: hoverPos.nodePos, to: hoverPos.nodePos + node.nodeSize }).run();
    }
    setMenuOpen(false);
    setHoverPos(null);
  };

  const handleDuplicate = () => {
    const node = editor.state.doc.nodeAt(hoverPos.nodePos);
    if (node) {
      const insertPos = hoverPos.nodePos + node.nodeSize;
      editor.chain().focus().insertContentAt(insertPos, node.toJSON()).run();
    }
    setMenuOpen(false);
  };

  const handleTurnInto = (type: string) => {
    const node = editor.state.doc.nodeAt(hoverPos.nodePos);
    if (!node) return;
    editor.chain().focus().setNodeSelection(hoverPos.nodePos).run();
    switch (type) {
      case 'paragraph': editor.chain().focus().setParagraph().run(); break;
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
    }
    setMenuOpen(false);
  };

  const handlePlusClick = () => {
    const node = editor.state.doc.nodeAt(hoverPos.nodePos);
    if (node) {
      const endPos = hoverPos.nodePos + node.nodeSize;
      editor.chain().focus().insertContentAt(endPos, { type: 'paragraph' }).run();
      // Position cursor
      setTimeout(() => {
        editor.chain().focus().setTextSelection(endPos + 1).run();
        const coords = editor.view.coordsAtPos(endPos + 1);
        onSlashMenu({ top: coords.bottom + 4, left: coords.left });
      }, 10);
    }
  };

  return (
    <>
      {/* Handle buttons */}
      <div
        className="fixed z-30 flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity duration-150 block-handle-group"
        style={{ top: hoverPos.top + 2, left: hoverPos.left }}
      >
        <button
          onClick={handlePlusClick}
          className="w-6 h-6 rounded-md flex items-center justify-center text-text-tertiary hover:bg-surface-hover hover:text-text-secondary transition-colors"
          title="Add block below"
        >
          <IconPlus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-text-tertiary hover:bg-surface-hover hover:text-text-secondary transition-colors cursor-grab"
          title="Drag to move / Click for options"
        >
          <span className="text-sm leading-none">⠿</span>
        </button>
      </div>

      {/* Block action menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl py-1 min-w-[200px]"
          style={{ top: hoverPos.top + 28, left: hoverPos.left }}
        >
          <button onClick={handleDelete} className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary flex items-center gap-2 transition-colors">
            <IconTrash className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={handleDuplicate} className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary flex items-center gap-2 transition-colors">
            <IconCopy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <div className="h-px bg-border my-1" />
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Turn into</div>
          {[
            { id: 'paragraph', label: 'Text' },
            { id: 'h1', label: 'Heading 1' },
            { id: 'h2', label: 'Heading 2' },
            { id: 'h3', label: 'Heading 3' },
            { id: 'bullet', label: 'Bullet List' },
            { id: 'ordered', label: 'Numbered List' },
            { id: 'quote', label: 'Quote' },
            { id: 'code', label: 'Code Block' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTurnInto(item.id)}
              className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
