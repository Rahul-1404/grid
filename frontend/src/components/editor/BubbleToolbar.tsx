import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  IconBold, IconItalic, IconUnderline, IconStrikethrough,
  IconCode, IconHighlight, IconLink, IconMessage,
} from '../../lib/icons';

interface BubbleToolbarProps {
  editor: Editor;
  pos: { x: number; y: number };
  onComment: () => void;
}

function BubbleBtn({
  onClick, active, children, title,
}: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-all duration-100 ${
        active
          ? 'bg-accent/20 text-accent'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export default function BubbleToolbar({ editor, pos, onComment }: BubbleToolbarProps) {
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const handleLink = () => {
    if (showLink) {
      if (linkUrl.trim()) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setShowLink(false);
      setLinkUrl('');
    } else {
      const prev = editor.getAttributes('link').href || '';
      setLinkUrl(prev);
      setShowLink(true);
    }
  };

  // Heading dropdown
  const [showHeading, setShowHeading] = useState(false);
  const currentBlock = editor.isActive('heading', { level: 1 }) ? 'H1'
    : editor.isActive('heading', { level: 2 }) ? 'H2'
    : editor.isActive('heading', { level: 3 }) ? 'H3'
    : 'Text';

  // Color picker
  const [showColors, setShowColors] = useState(false);
  const highlightColors = [
    { label: 'Yellow', value: 'rgba(234,179,8,0.3)' },
    { label: 'Blue', value: 'rgba(59,130,246,0.3)' },
    { label: 'Green', value: 'rgba(34,197,94,0.3)' },
    { label: 'Pink', value: 'rgba(236,72,153,0.3)' },
    { label: 'Purple', value: 'rgba(139,92,246,0.3)' },
    { label: 'Orange', value: 'rgba(249,115,22,0.3)' },
  ];

  // Position: center above selection
  const left = Math.max(8, Math.min(pos.x - 180, window.innerWidth - 380));
  const top = pos.y - 52;

  return (
    <div
      className="fixed z-50 bubble-toolbar"
      style={{ top, left }}
    >
      <div className="flex items-center bg-surface border border-border rounded-xl shadow-2xl px-1 py-0.5 gap-0.5">
        {/* Block type dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowHeading(!showHeading); setShowColors(false); }}
            className="px-2 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors flex items-center gap-1"
          >
            {currentBlock}
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {showHeading && (
            <div className="absolute top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-2xl py-1 min-w-[120px] z-50">
              {(['Text', 'H1', 'H2', 'H3'] as const).map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    if (h === 'Text') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: parseInt(h[1]) as 1 | 2 | 3 }).run();
                    setShowHeading(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                    currentBlock === h ? 'text-text-primary bg-surface-hover' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                  }`}
                >
                  {h === 'Text' ? 'Paragraph' : `Heading ${h[1]}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border" />

        <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <IconBold className="w-3.5 h-3.5" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <IconItalic className="w-3.5 h-3.5" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <IconUnderline className="w-3.5 h-3.5" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <IconStrikethrough className="w-3.5 h-3.5" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
          <IconCode className="w-3.5 h-3.5" />
        </BubbleBtn>

        <div className="w-px h-5 bg-border" />

        {/* Highlight color */}
        <div className="relative">
          <BubbleBtn
            onClick={() => { setShowColors(!showColors); setShowHeading(false); }}
            active={editor.isActive('highlight')}
            title="Highlight"
          >
            <IconHighlight className="w-3.5 h-3.5" />
          </BubbleBtn>
          {showColors && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-surface border border-border rounded-lg shadow-2xl p-2 z-50">
              <div className="grid grid-cols-3 gap-1.5">
                {highlightColors.map((c) => (
                  <button
                    key={c.label}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: c.value }).run();
                      setShowColors(false);
                    }}
                    className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ background: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowColors(false);
                }}
                className="w-full mt-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors py-1"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <BubbleBtn onClick={handleLink} active={editor.isActive('link')} title="Link">
          <IconLink className="w-3.5 h-3.5" />
        </BubbleBtn>

        <div className="w-px h-5 bg-border" />

        <BubbleBtn onClick={onComment} title="Comment">
          <IconMessage className="w-3.5 h-3.5" />
        </BubbleBtn>
      </div>

      {/* Link input */}
      {showLink && (
        <div className="mt-1 bg-surface border border-border rounded-lg shadow-2xl px-2 py-1.5 flex gap-2">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLink(); if (e.key === 'Escape') setShowLink(false); }}
            placeholder="Paste link..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <button
            onClick={handleLink}
            className="text-xs text-accent hover:text-accent-hover font-medium px-2"
          >
            Apply
          </button>
          {editor.isActive('link') && (
            <button
              onClick={() => { editor.chain().focus().unsetLink().run(); setShowLink(false); }}
              className="text-xs text-danger hover:text-red-400 font-medium px-1"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
