import { create } from 'zustand';
import type { PanelView } from '../types';

interface EditorState {
  panelView: PanelView;
  showSlashMenu: boolean;
  showAddAgentModal: boolean;
  showInviteModal: boolean;
  showSettingsModal: boolean;
  showCreateWorkspaceModal: boolean;
  floatingCommentPos: { x: number; y: number } | null;
  docContent: string;
  setPanelView: (view: PanelView) => void;
  setDocContent: (content: string) => void;
  setShowSlashMenu: (show: boolean) => void;
  setShowAddAgentModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowCreateWorkspaceModal: (show: boolean) => void;
  setFloatingCommentPos: (pos: { x: number; y: number } | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  panelView: 'comments',
  showSlashMenu: false,
  showAddAgentModal: false,
  showInviteModal: false,
  showSettingsModal: false,
  showCreateWorkspaceModal: false,
  floatingCommentPos: null,
  docContent: '',
  setPanelView: (panelView) => set({ panelView }),
  setDocContent: (docContent) => set({ docContent }),
  setShowSlashMenu: (showSlashMenu) => set({ showSlashMenu }),
  setShowAddAgentModal: (showAddAgentModal) => set({ showAddAgentModal }),
  setShowInviteModal: (showInviteModal) => set({ showInviteModal }),
  setShowSettingsModal: (showSettingsModal) => set({ showSettingsModal }),
  setShowCreateWorkspaceModal: (showCreateWorkspaceModal) => set({ showCreateWorkspaceModal }),
  setFloatingCommentPos: (floatingCommentPos) => set({ floatingCommentPos }),
}));
