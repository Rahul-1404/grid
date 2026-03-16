import { create } from 'zustand';
import type { Comment, CommentReply } from '../types';

interface CommentState {
  comments: Comment[];
  activeCommentId: string | null;
  pendingSelection: { from: number; to: number; text: string } | null;
  setActiveComment: (id: string | null) => void;
  setPendingSelection: (sel: { from: number; to: number; text: string } | null) => void;
  addComment: (comment: Comment) => void;
  addReply: (commentId: string, reply: CommentReply) => void;
  resolveComment: (id: string) => void;
  unresolveComment: (id: string) => void;
  updateReply: (commentId: string, replyId: string, updates: Partial<CommentReply>) => void;
}

export const useCommentStore = create<CommentState>((set) => ({
  comments: [],
  activeCommentId: null,
  pendingSelection: null,
  setActiveComment: (activeCommentId) => set({ activeCommentId }),
  setPendingSelection: (pendingSelection) => set({ pendingSelection }),
  addComment: (comment) => set((s) => ({ comments: [...s.comments, comment] })),
  addReply: (commentId, reply) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      ),
    })),
  resolveComment: (id) =>
    set((s) => ({
      comments: s.comments.map((c) => (c.id === id ? { ...c, resolved: true } : c)),
    })),
  unresolveComment: (id) =>
    set((s) => ({
      comments: s.comments.map((c) => (c.id === id ? { ...c, resolved: false } : c)),
    })),
  updateReply: (commentId, replyId, updates) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: c.replies.map((r) =>
                r.id === replyId ? { ...r, ...updates } : r
              ),
            }
          : c
      ),
    })),
}));
