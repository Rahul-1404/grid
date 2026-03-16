import { useEffect } from 'react';
import { IconX } from '../../lib/icons';

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const mod = isMac ? '\u2318' : 'Ctrl';

const SHORTCUTS = [
  { category: 'General', items: [
    { keys: [`${mod}+K`], desc: 'Search documents' },
    { keys: ['?'], desc: 'Show keyboard shortcuts' },
    { keys: ['Esc'], desc: 'Close panels & modals' },
  ]},
  { category: 'Editing', items: [
    { keys: ['/'], desc: 'Slash commands' },
    { keys: [`${mod}+B`], desc: 'Bold' },
    { keys: [`${mod}+I`], desc: 'Italic' },
    { keys: [`${mod}+U`], desc: 'Underline' },
    { keys: [`${mod}+E`], desc: 'Inline code' },
    { keys: [`${mod}+Shift+S`], desc: 'Strikethrough' },
    { keys: [`${mod}+Shift+H`], desc: 'Highlight' },
  ]},
  { category: 'Collaboration', items: [
    { keys: [`${mod}+Enter`], desc: 'Send comment' },
    { keys: [`${mod}+Shift+M`], desc: 'Toggle comments panel' },
  ]},
];

interface Props {
  onClose: () => void;
}

export default function ShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{section.category}</h3>
              <div className="space-y-1">
                {section.items.map((shortcut) => (
                  <div key={shortcut.desc} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-hover/50 transition-colors">
                    <span className="text-sm text-text-secondary">{shortcut.desc}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd key={key} className="px-2 py-0.5 rounded-md bg-bg border border-border text-xs font-mono text-text-primary min-w-[24px] text-center">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
