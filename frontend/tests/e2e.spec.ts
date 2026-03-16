import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5174';
const API = 'http://localhost:3001';

// ─── Part 1: Landing Page (no auth) ────────────────────────────

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // Wait for React to hydrate — look for the nav brand text
    await page.waitForSelector('text=Grid', { timeout: 10000 });
  });

  test('renders page title and hero text', async ({ page }) => {
    await expect(page.locator('text=Grid').first()).toBeVisible();
    await expect(page.locator('text=humans and agents')).toBeVisible();
  });

  test('shows Get Started and Sign In buttons', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Get Started' }).first()).toBeVisible();
    await expect(page.locator('button', { hasText: 'Sign In' })).toBeVisible();
  });

  test('shows product mock with workspace UI', async ({ page }) => {
    await expect(page.locator('text=Grid Workspace').first()).toBeVisible();
    await expect(page.locator('text=Getting Started').first()).toBeVisible();
  });

  test('Get Started button opens Clerk sign-up', async ({ page }) => {
    await page.locator('button', { hasText: 'Get Started Free' }).first().click();
    // Should navigate to auth view — look for the Back button
    await expect(page.locator('text=Back')).toBeVisible({ timeout: 5000 });
    // Go back
    await page.locator('text=Back').click();
    await expect(page.locator('text=humans and agents')).toBeVisible();
  });

  test('Sign In button opens Clerk sign-in', async ({ page }) => {
    await page.locator('button', { hasText: 'Sign In' }).click();
    await expect(page.locator('text=Back')).toBeVisible({ timeout: 5000 });
    await page.locator('text=Back').click();
    await expect(page.locator('text=humans and agents')).toBeVisible();
  });

  test('How It Works link scrolls to section', async ({ page }) => {
    const howLink = page.locator('a[href="#how-it-works"]');
    await expect(howLink).toBeVisible();
    await howLink.click();
    const section = page.locator('#how-it-works');
    await expect(section).toBeVisible();
    await expect(page.locator('text=Up and running in 60 seconds')).toBeVisible();
  });

  test('features section lists all 6 features', async ({ page }) => {
    const features = [
      'Bring Your Own Agent',
      'Real-Time Editing',
      'Agent Kanban',
      'Offline Queuing',
      'Doc Intelligence',
      'Invite Friends',
    ];
    for (const f of features) {
      await expect(page.locator(`text=${f}`)).toBeVisible();
    }
  });

  test('footer has Ollie Labs link and Twitter/X link', async ({ page }) => {
    await expect(page.locator('a[href="https://ollielabs.com"]')).toBeVisible();
    await expect(page.locator('a[href="https://x.com/TryOllieLabs"]')).toBeVisible();
  });

  test('agent compatibility section lists agent names', async ({ page }) => {
    for (const name of ['Claude', 'Codex', 'Gemini', 'Custom Bots']) {
      await expect(page.locator(`text=${name}`).first()).toBeVisible();
    }
  });
});

// ─── Part 2: API / Backend Tests ────────────────────────────────

test.describe('Backend API', () => {
  test('GET /api/agents returns 200', async ({ request }) => {
    const res = await request.get(`${API}/api/agents`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/agents creates an agent', async ({ request }) => {
    const res = await request.post(`${API}/api/agents`, {
      data: {
        name: 'Test Agent',
        capabilities: ['read', 'write'],
      },
    });
    // Backend returns 201 for created resources
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.token).toBeTruthy();
    // Backend may or may not echo the name back
    if (body.name) {
      expect(body.name).toBe('Test Agent');
    }
  });

  test('POST /api/invite requires email', async ({ request }) => {
    const res = await request.post(`${API}/api/invite`, {
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Email required');
  });

  test('WebSocket connects to agent gateway', async () => {
    const ws = await new Promise<{ connected: boolean; messages: string[] }>((resolve) => {
      const messages: string[] = [];
      let connected = false;

      import('ws').then(({ default: WS }) => {
        const socket = new WS(`ws://localhost:3001/agent`);

        socket.on('open', () => {
          connected = true;
          socket.send(JSON.stringify({
            type: 'auth',
            token: 'test-token-invalid',
          }));
        });

        socket.on('message', (data: Buffer) => {
          messages.push(data.toString());
        });

        setTimeout(() => {
          socket.close();
          resolve({ connected, messages });
        }, 2000);

        socket.on('error', () => {
          resolve({ connected, messages });
        });
      }).catch(() => {
        resolve({ connected: false, messages: [] });
      });
    });

    expect(ws.connected).toBe(true);
  });
});

// ─── Part 3: Visual / Screenshot Tests ──────────────────────────

test.describe('Visual checks', () => {
  test('landing page screenshot', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Grid', { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/landing-page.png', fullPage: true });
  });

  test('auth view screenshot', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Sign In', { timeout: 10000 });
    await page.locator('button', { hasText: 'Sign In' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/screenshots/auth-view.png', fullPage: true });
  });
});
