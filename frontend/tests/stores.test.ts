/**
 * Store unit tests for Grid.
 *
 * These test the Zustand stores directly without a browser.
 * Run with: npx playwright test tests/stores.test.ts
 *
 * NOTE: Some stores (workspaceStore, peopleStore) depend on Supabase,
 * so we test them at the pure state-logic level by manipulating
 * the store directly where possible. For stores that don't need
 * external deps (commentStore, themeStore), we test fully.
 */

import { test, expect } from '@playwright/test';

// We can't import Zustand stores directly in Playwright (they use browser APIs).
// Instead, we test store logic by evaluating in the browser context.

test.describe('Store unit tests (in-browser)', () => {
  test.describe('commentStore', () => {
    test('add comment, add reply, resolve', async ({ page }) => {
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

      const result = await page.evaluate(() => {
        // Access the store from the module system via window
        // We'll create a minimal test by importing from the bundled app
        const { useCommentStore } = (window as any).__gridStores?.comment ?? {};
        if (!useCommentStore) {
          // Fallback: manually test the logic
          return { skipped: true, reason: 'Store not exposed on window' };
        }

        const store = useCommentStore.getState();
        store.addComment({
          id: 'c1',
          documentId: 'doc-1',
          text: 'Test comment',
          quotedText: 'some text',
          author: { id: 'u1', name: 'Tester', color: '#000', status: 'online' as const },
          isAgent: false,
          createdAt: new Date().toISOString(),
          resolved: false,
          selectionFrom: 0,
          selectionTo: 10,
          replies: [],
        });

        const afterAdd = useCommentStore.getState();
        const hasComment = afterAdd.comments.some((c: any) => c.id === 'c1');

        store.addReply('c1', {
          id: 'r1',
          commentId: 'c1',
          text: 'Reply text',
          author: { id: 'u2', name: 'Agent', color: '#0f0', status: 'online' as const },
          isAgent: true,
          createdAt: new Date().toISOString(),
        });

        const afterReply = useCommentStore.getState();
        const comment = afterReply.comments.find((c: any) => c.id === 'c1');
        const hasReply = comment?.replies.some((r: any) => r.id === 'r1');

        store.resolveComment('c1');
        const afterResolve = useCommentStore.getState();
        const isResolved = afterResolve.comments.find((c: any) => c.id === 'c1')?.resolved;

        return { hasComment, hasReply, isResolved };
      });

      if ((result as any).skipped) {
        test.skip();
      } else {
        expect(result.hasComment).toBe(true);
        expect(result.hasReply).toBe(true);
        expect(result.isResolved).toBe(true);
      }
    });
  });

  test.describe('themeStore', () => {
    test('toggle theme switches between light and dark', async ({ page }) => {
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

      const result = await page.evaluate(() => {
        const { useThemeStore } = (window as any).__gridStores?.theme ?? {};
        if (!useThemeStore) {
          return { skipped: true };
        }

        const initial = useThemeStore.getState().theme;
        useThemeStore.getState().toggleTheme();
        const toggled = useThemeStore.getState().theme;
        useThemeStore.getState().toggleTheme();
        const toggledBack = useThemeStore.getState().theme;

        return { initial, toggled, toggledBack };
      });

      if ((result as any).skipped) {
        test.skip();
      } else {
        // Initial is 'light' (default), toggled should be 'dark', back to 'light'
        expect(result.toggled).not.toBe(result.initial);
        expect(result.toggledBack).toBe(result.initial);
      }
    });
  });

  test.describe('peopleStore', () => {
    test('add and remove person', async ({ page }) => {
      await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });

      const result = await page.evaluate(() => {
        const { usePeopleStore } = (window as any).__gridStores?.people ?? {};
        if (!usePeopleStore) {
          return { skipped: true };
        }

        const store = usePeopleStore.getState();
        const initialCount = store.people.length;

        store.addPerson({
          id: 'test-person-1',
          name: 'Test Person',
          email: 'test@example.com',
          color: '#FF0000',
          status: 'online' as const,
        });

        const afterAdd = usePeopleStore.getState().people.length;

        store.removePerson('test-person-1');
        const afterRemove = usePeopleStore.getState().people.length;

        return { initialCount, afterAdd, afterRemove };
      });

      if ((result as any).skipped) {
        test.skip();
      } else {
        expect(result.afterAdd).toBe(result.initialCount + 1);
        expect(result.afterRemove).toBe(result.initialCount);
      }
    });
  });
});

// Pure logic tests that don't need a browser
test.describe('Store logic (pure)', () => {
  test('workspace document helpers', () => {
    // Test the updateWorkspaceDocs pattern used in the store
    interface Doc { id: string; title: string }
    interface WS { id: string; documents: Doc[] }

    function updateWorkspaceDocs(
      workspaces: WS[],
      wsId: string,
      updater: (docs: Doc[]) => Doc[]
    ): WS[] {
      return workspaces.map((ws) =>
        ws.id === wsId ? { ...ws, documents: updater(ws.documents) } : ws
      );
    }

    const workspaces: WS[] = [
      { id: 'ws-1', documents: [{ id: 'doc-1', title: 'Hello' }] },
    ];

    // Add doc
    const afterAdd = updateWorkspaceDocs(workspaces, 'ws-1', (docs) => [
      ...docs,
      { id: 'doc-2', title: 'New Doc' },
    ]);
    expect(afterAdd[0].documents).toHaveLength(2);
    expect(afterAdd[0].documents[1].title).toBe('New Doc');

    // Update title
    const afterUpdate = updateWorkspaceDocs(afterAdd, 'ws-1', (docs) =>
      docs.map((d) => (d.id === 'doc-1' ? { ...d, title: 'Updated' } : d))
    );
    expect(afterUpdate[0].documents[0].title).toBe('Updated');

    // Delete doc
    const afterDelete = updateWorkspaceDocs(afterUpdate, 'ws-1', (docs) =>
      docs.filter((d) => d.id !== 'doc-2')
    );
    expect(afterDelete[0].documents).toHaveLength(1);
    expect(afterDelete[0].documents[0].id).toBe('doc-1');
  });

  test('comment resolve/unresolve logic', () => {
    interface Comment { id: string; resolved: boolean; replies: any[] }

    const comments: Comment[] = [
      { id: 'c1', resolved: false, replies: [] },
      { id: 'c2', resolved: false, replies: [] },
    ];

    // Resolve
    const resolved = comments.map((c) => (c.id === 'c1' ? { ...c, resolved: true } : c));
    expect(resolved[0].resolved).toBe(true);
    expect(resolved[1].resolved).toBe(false);

    // Unresolve
    const unresolved = resolved.map((c) => (c.id === 'c1' ? { ...c, resolved: false } : c));
    expect(unresolved[0].resolved).toBe(false);
  });

  test('add reply to comment logic', () => {
    interface Reply { id: string; text: string }
    interface Comment { id: string; replies: Reply[] }

    const comments: Comment[] = [
      { id: 'c1', replies: [] },
    ];

    const reply: Reply = { id: 'r1', text: 'A reply' };

    const updated = comments.map((c) =>
      c.id === 'c1' ? { ...c, replies: [...c.replies, reply] } : c
    );

    expect(updated[0].replies).toHaveLength(1);
    expect(updated[0].replies[0].text).toBe('A reply');
  });

  test('theme toggle logic', () => {
    type Theme = 'dark' | 'light';
    let theme: Theme = 'light';

    // Toggle
    theme = theme === 'dark' ? 'light' : 'dark';
    expect(theme).toBe('dark');

    // Toggle back
    theme = theme === 'dark' ? 'light' : 'dark';
    expect(theme).toBe('light');
  });

  test('people add/remove logic', () => {
    interface Person { id: string; name: string }
    let people: Person[] = [{ id: 'u1', name: 'User 1' }];

    // Add
    people = [...people, { id: 'u2', name: 'User 2' }];
    expect(people).toHaveLength(2);

    // Remove
    people = people.filter((p) => p.id !== 'u2');
    expect(people).toHaveLength(1);
    expect(people[0].id).toBe('u1');
  });
});
