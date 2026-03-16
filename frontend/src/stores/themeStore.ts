import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const stored = typeof window !== 'undefined' ? localStorage.getItem('grid-theme') as Theme | null : null;

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: stored || 'light',

  setTheme: (theme) => {
    localStorage.setItem('grid-theme', theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
}

// Apply on load
applyTheme(useThemeStore.getState().theme);
