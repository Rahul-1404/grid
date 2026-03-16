import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { IconX } from '../../lib/icons';

const GRADIENT_OPTIONS = [
  { label: 'Blue', value: 'from-accent to-agent' },
  { label: 'Purple', value: 'from-purple-500 to-pink-500' },
  { label: 'Green', value: 'from-emerald-500 to-teal-500' },
  { label: 'Orange', value: 'from-orange-500 to-amber-500' },
  { label: 'Red', value: 'from-red-500 to-rose-500' },
  { label: 'Cyan', value: 'from-cyan-500 to-blue-500' },
];

export default function CreateWorkspaceModal() {
  const { setShowCreateWorkspaceModal } = useEditorStore();
  const { createWorkspace, switchWorkspace, workspaces } = useWorkspaceStore();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GRADIENT_OPTIONS[0].value);

  const handleCreate = () => {
    if (!name.trim()) return;
    createWorkspace(name.trim(), selectedColor);
    // Switch to the newly created workspace
    setTimeout(() => {
      const ws = useWorkspaceStore.getState().workspaces;
      const newest = ws[ws.length - 1];
      if (newest) switchWorkspace(newest.id);
    }, 0);
    setShowCreateWorkspaceModal(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateWorkspaceModal(false)} />
      <div className="relative bg-surface border border-border rounded-xl shadow-2xl w-[400px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Create Workspace</h2>
          <button
            onClick={() => setShowCreateWorkspaceModal(false)}
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Workspace name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="My Workspace"
              className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Color</label>
            <div className="flex gap-2">
              {GRADIENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedColor(opt.value)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${opt.value} transition-all ${
                    selectedColor === opt.value ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-105'
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-bg border border-border">
            <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${selectedColor} flex items-center justify-center text-sm font-bold text-white`}>
              {name.trim() ? name.trim().charAt(0).toUpperCase() : 'W'}
            </div>
            <span className="text-sm text-text-primary font-medium">{name.trim() || 'My Workspace'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            onClick={() => setShowCreateWorkspaceModal(false)}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
