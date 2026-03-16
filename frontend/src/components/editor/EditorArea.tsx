import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Typography from '@tiptap/extension-typography';
import Focus from '@tiptap/extension-focus';
import Dropcursor from '@tiptap/extension-dropcursor';
import CharacterCount from '@tiptap/extension-character-count';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { common, createLowlight } from 'lowlight';

import SlashCommandMenu from './SlashCommandMenu';
import BubbleToolbar from './BubbleToolbar';
import BlockHandle from './BlockHandle';
import DocInfo from './DocInfo';
import { DatabaseNode } from '../database/DatabaseExtension';
import { useWorkspaceStore, selectDocuments, selectWorkspaceName } from '../../stores/workspaceStore';
import { useCommentStore } from '../../stores/commentStore';
import { useEditorStore } from '../../stores/editorStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { useUser } from '@clerk/clerk-react';
import { IconMessage, IconActivity } from '../../lib/icons';
import { timeAgo } from '../../lib/utils';

const lowlight = createLowlight(common);

const EMOJI_LIST = ['📄', '🚀', '🎯', '💡', '🔥', '⚡', '🎨', '📝', '🗺️', '📡', '🧠', '⭐', '🏗️', '📊', '🔒', '🌍', '💬', '🎉', '📌', '🧩'];

const CURSOR_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

export default function EditorArea() {
  const { currentDocId, updateDocTitle, updateDocIcon } = useWorkspaceStore();
  const { user } = useUser();
  const documents = useWorkspaceStore(selectDocuments);
  const workspaceName = useWorkspaceStore(selectWorkspaceName);
  const { setPendingSelection } = useCommentStore();
  const { panelView, setPanelView, setFloatingCommentPos, setDocContent } = useEditorStore();

  // Yjs collaborative document
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const ydoc = useMemo(() => {
    // Cleanup previous
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }
    if (!currentDocId) return null;
    const doc = new Y.Doc();
    ydocRef.current = doc;
    return doc;
  }, [currentDocId]);

  const provider = useMemo(() => {
    if (!ydoc || !currentDocId) return null;
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3001'}/yjs`;
    const p = new WebsocketProvider(wsUrl, currentDocId, ydoc);
    providerRef.current = p;
    return p;
  }, [ydoc, currentDocId]);

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  const [providerSynced, setProviderSynced] = useState(false);

  // Track when the provider is synced so we can safely add CollaborationCursor
  useEffect(() => {
    if (!provider) {
      setProviderSynced(false);
      return;
    }
    if (provider.synced) {
      setProviderSynced(true);
    }
    const onSync = (synced: boolean) => {
      if (synced) setProviderSynced(true);
    };
    provider.on('sync', onSync);
    return () => {
      provider.off('sync', onSync);
    };
  }, [provider]);

  const [welcomeDismissed, setWelcomeDismissed] = useState(() => localStorage.getItem('grid-welcome-dismissed') === '1');
  const dismissWelcome = useCallback(() => {
    setWelcomeDismissed(true);
    localStorage.setItem('grid-welcome-dismissed', '1');
  }, []);

  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);
  const [title, setTitle] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const selectionRef = useRef<{ from: number; to: number; text: string } | null>(null);

  const currentDoc = documents.find((d) => d.id === currentDocId);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentDoc) setTitle(currentDoc.title);
  }, [currentDoc?.id]);

  // Close icon picker on click outside
  useEffect(() => {
    if (!showIconPicker) return;
    const handler = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIconPicker]);

  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        dropcursor: false,
        ...({ history: false } as any), // Disable history when using collaboration
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
      }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      TextStyle,
      Color,
      Typography,
      Focus.configure({ className: 'has-focus', mode: 'all' }),
      Dropcursor.configure({ color: '#3B82F6', width: 2 }),
      CharacterCount,
      DatabaseNode,
    ];
    if (ydoc) {
      exts.push(
        Collaboration.configure({
          document: ydoc,
        }) as typeof DatabaseNode,
      );
      // CollaborationCursor disabled — causes "Cannot read properties of undefined (reading 'doc')"
      // when provider reconnects or extensions array changes. Agent cursors tracked via activity feed instead.
    }
    return exts;
  }, [ydoc, provider, providerSynced, user?.fullName, user?.firstName]);

  const editor = useEditor({
    extensions,
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/') {
          setTimeout(() => {
            const { from } = view.state.selection;
            const coords = view.coordsAtPos(from);
            setSlashMenuPos({ top: coords.bottom + 4, left: coords.left });
          }, 10);
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Keep doc content synced for agent context (comments bridge)
      setDocContent(ed.getText());
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to, ' ');
        const coords = ed.view.coordsAtPos(from);
        const endCoords = ed.view.coordsAtPos(to);
        selectionRef.current = { from, to, text };
        setBubblePos({
          x: (coords.left + endCoords.left) / 2,
          y: Math.min(coords.top, endCoords.top),
        });
        setFloatingCommentPos({ x: coords.left, y: coords.top });
      } else {
        selectionRef.current = null;
        setBubblePos(null);
        setFloatingCommentPos(null);
      }
    },
  }, [extensions]);

  const handleAddComment = useCallback(() => {
    if (!selectionRef.current) return;
    const sel = selectionRef.current;
    setPendingSelection(sel);
    setPanelView('comments');
    setFloatingCommentPos(null);
    setBubblePos(null);
    if (editor) {
      editor.chain().focus().setHighlight({ color: 'rgba(59,130,246,0.15)' }).run();
    }
  }, [editor, setPendingSelection, setPanelView, setFloatingCommentPos]);

  // Word count — compute from editor text on updates
  const [wordCount, setWordCount] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const updateWordCount = () => {
      const text = editor.getText();
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(count);
    };
    editor.on('update', updateWordCount);
    updateWordCount();
    return () => { editor.off('update', updateWordCount); };
  }, [editor]);

  // Table of contents from headings
  const [toc, setToc] = useState<{ level: number; text: string; pos: number }[]>([]);
  useEffect(() => {
    if (!editor) return;
    const updateToc = () => {
      const items: { level: number; text: string; pos: number }[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({ level: node.attrs.level, text: node.textContent, pos });
        }
      });
      setToc(items);
    };
    editor.on('update', updateToc);
    updateToc();
    return () => { editor.off('update', updateToc); };
  }, [editor]);

  if (!currentDocId || !currentDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-full bg-bg">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">No document selected</h2>
        <p className="text-sm text-text-secondary">Create a new document from the sidebar to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-bg">
      {/* Top bar - minimal, just breadcrumb + panel toggles */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span className="text-text-secondary">{workspaceName}</span>
          <span>/</span>
          <span className="text-text-primary">{currentDoc?.title || 'Untitled'}</span>
          {currentDoc && (
            <span className="ml-3 text-text-tertiary">
              Edited {timeAgo(currentDoc.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="text-[11px] text-text-tertiary mr-3">
            {wordCount} words
          </div>
          <button
            onClick={() => setPanelView(panelView === 'comments' ? 'none' : 'comments')}
            className={`p-1.5 rounded-md transition-colors ${
              panelView === 'comments' ? 'bg-accent/20 text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
            }`}
            title="Comments"
          >
            <IconMessage className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPanelView(panelView === 'activity' ? 'none' : 'activity')}
            className={`p-1.5 rounded-md transition-colors ${
              panelView === 'activity' ? 'bg-accent/20 text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
            }`}
            title="Activity"
          >
            <IconActivity className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto editor-scroll-container">
        <div className="max-w-[720px] mx-auto px-12 py-10 relative">
          {/* Page icon */}
          <div className="mb-3 relative" ref={iconPickerRef}>
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="text-5xl hover:bg-surface-hover/50 rounded-lg p-1 transition-colors inline-block"
              title="Change icon"
            >
              {currentDoc?.icon || '📄'}
            </button>
            {showIconPicker && (
              <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl p-3 z-50 grid grid-cols-5 gap-1.5">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (currentDocId) updateDocIcon(currentDocId, emoji);
                      setShowIconPicker(false);
                    }}
                    className="w-10 h-10 rounded-lg hover:bg-surface-hover flex items-center justify-center text-xl transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Document Title */}
          <input
            value={title}
            onChange={(e) => {
              const val = e.target.value.slice(0, 200);
              setTitle(val);
              if (currentDocId) updateDocTitle(currentDocId, val);
            }}
            placeholder="Untitled"
            maxLength={200}
            className="w-full text-[40px] font-bold bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary mb-2 leading-tight"
          />

          {/* Doc Info — properties, tags, metadata */}
          {currentDocId && <DocInfo docId={currentDocId} />}

          {/* Welcome banner for first-time users */}
          {!welcomeDismissed && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl p-5 relative">
              <button onClick={dismissWelcome} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none">&times;</button>
              <div className="text-lg font-semibold text-gray-900 mb-2">Welcome to Grid! 👋</div>
              <ul className="space-y-1.5 text-sm text-gray-600 mb-3">
                <li>Select text to comment, type <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 text-xs font-mono">/</kbd> for commands</li>
                <li>Click <strong>"Add Agent"</strong> to connect your first AI agent</li>
              </ul>
              <button onClick={dismissWelcome} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">Got it</button>
            </div>
          )}

          {/* Subtle separator */}
          <div className="h-px bg-border/30 mb-8" />

          {/* Editor */}
          <EditorContent editor={editor} />
        </div>

      </div>

      {/* Bubble toolbar on selection */}
      {bubblePos && editor && !slashMenuPos && (
        <BubbleToolbar
          editor={editor}
          pos={bubblePos}
          onComment={handleAddComment}
        />
      )}

      {/* Block handle */}
      {editor && (
        <BlockHandle editor={editor} onSlashMenu={setSlashMenuPos} />
      )}

      {/* Slash command menu */}
      {slashMenuPos && editor && (
        <SlashCommandMenu
          editor={editor}
          pos={slashMenuPos}
          onClose={() => setSlashMenuPos(null)}
        />
      )}
    </div>
  );
}
