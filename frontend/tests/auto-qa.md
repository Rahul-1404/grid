# Automated QA for Grid

## Quick Run
```bash
npx playwright test
```

## Full Run (starts servers automatically)
```bash
bash tests/run-tests.sh
```

## What It Tests

### E2E Tests (`tests/e2e.spec.ts`)

**Landing Page (no auth required):**
- Page renders with title, hero text, and "humans and agents" heading
- Get Started and Sign In buttons are visible and functional
- Product mock renders with workspace UI preview
- Get Started opens Clerk sign-up view
- Sign In opens Clerk sign-in view
- "How It Works" anchor scrolls to the correct section
- All 6 feature cards are displayed
- Footer contains Ollie Labs and Twitter/X links
- Agent compatibility section lists supported agents

**Backend API:**
- `GET /api/agents` returns 200 with agent array
- `POST /api/agents` creates agent and returns id + token
- `POST /api/invite` validates email is required (400)
- WebSocket connects to `/agent` gateway

**Visual:**
- Full-page screenshot of landing page
- Screenshot of auth view

### Store Unit Tests (`tests/stores.test.ts`)

**Pure logic tests (no browser needed):**
- Workspace document helpers: add doc, update title, delete doc
- Comment logic: resolve, unresolve
- Reply logic: add reply to comment
- Theme toggle: light to dark and back
- People: add/remove person

**In-browser store tests (if stores are exposed):**
- commentStore: addComment, addReply, resolveComment
- themeStore: toggleTheme
- peopleStore: addPerson, removePerson

## Configuration
- Playwright config: `playwright.config.ts`
- Screenshots on failure: enabled
- Browser: Chromium
- Base URL: http://localhost:5173
- Backend URL: http://localhost:3001

## Troubleshooting
- If tests fail with connection errors, make sure both servers are running
- Run `bash tests/run-tests.sh` to auto-start servers
- View HTML report: `npx playwright show-report`
