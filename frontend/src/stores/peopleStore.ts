import { create } from 'zustand';
import type { Person } from '../types';
import { supabase } from '../lib/supabase';

interface PeopleState {
  people: Person[];
  currentUser: Person;
  addPerson: (person: Person) => void;
  removePerson: (id: string) => void;
  updateStatus: (id: string, status: Person['status']) => void;
  setCurrentUser: (person: Person) => void;
  loadWorkspaceMembers: (workspaceId: string) => Promise<void>;
}

export const usePeopleStore = create<PeopleState>((set, get) => ({
  currentUser: {
    id: 'user-1',
    name: 'You',
    email: 'you@grid.dev',
    color: '#3B82F6',
    status: 'online',
  },
  people: [
    {
      id: 'user-1',
      name: 'You',
      email: 'you@grid.dev',
      color: '#3B82F6',
      status: 'online',
    },
  ],
  addPerson: (person) => set((s) => ({ people: [...s.people, person] })),
  removePerson: (id) => set((s) => ({ people: s.people.filter((p) => p.id !== id) })),
  updateStatus: (id, status) =>
    set((s) => ({
      people: s.people.map((p) => (p.id === id ? { ...p, status } : p)),
    })),
  setCurrentUser: (person) =>
    set((s) => ({
      currentUser: person,
      people: s.people.map((p) => (p.id === 'user-1' || p.id === s.currentUser.id ? person : p)),
    })),
  loadWorkspaceMembers: async (workspaceId: string) => {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, role, user_name, user_avatar')
      .eq('workspace_id', workspaceId);

    if (!members) return;

    const currentUser = get().currentUser;
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

    const people: Person[] = members.map((m, i) => {
      // If this is the current user, use their existing data
      if (m.user_id === currentUser.id) {
        return currentUser;
      }
      return {
        id: m.user_id,
        name: m.user_name || 'Team Member',
        color: colors[i % colors.length],
        status: 'offline' as const,
        avatar: m.user_avatar ?? undefined,
      };
    });

    // Ensure current user is always in the list
    if (!people.find((p) => p.id === currentUser.id)) {
      people.unshift(currentUser);
    }

    set({ people });
  },
}));
