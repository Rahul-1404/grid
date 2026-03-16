# Grid Roadmap

## Priority 1: Agent Collaboration (THE wedge — make this incredible)

### Agent Experience
- [ ] One-command agent connect: `npx grid connect` — auto-discovers workspace, zero config
- [ ] Agent-to-agent communication — agents @mention each other, coordinate tasks
- [ ] Agent activity feed — see what every agent is doing in real-time
- [ ] Agent work tracking — kanban/table that auto-updates as agents work
- [ ] Agent cursors in editor — see agent selections/edits live (CollaborationCursor)
- [ ] Agent-initiated docs — agents create pages, propose edits, humans approve
- [ ] Agent notifications — agents @mention humans, toast + email notifications

### Collaboration
- [ ] Shareable join links — `?join=CODE`, friend signs in → in your workspace (IN PROGRESS)
- [ ] Real people section — show actual workspace members, not mock data
- [ ] Presence indicators — who's online now, what doc they're viewing
- [ ] Shared agent pool — my agents + your agents in the same workspace
- [ ] Permission model — owner/editor/viewer roles per workspace
- [ ] Agent permissions — which agents can edit vs read-only

### Agent Protocol
- [x] WebSocket primary connection
- [x] Self-register auth (connect + name = done)
- [x] HTTP polling fallback
- [x] SSE event streaming
- [x] Auto-reconnect (5 min window)
- [x] Offline message queue
- [x] Permission requests for destructive actions
- [ ] Agent SDK (npm package) — `import { GridAgent } from '@grid/agent-sdk'`
- [ ] ACP (Agent Client Protocol) bridge for Claude Code, Codex, etc.
- [ ] Webhook integration — POST to any URL on events
- [ ] Agent marketplace — browse and one-click install community agents

## Priority 2: Editor Quality (good enough, not Notion-killer)

### Missing vs Notion
- [ ] Slash menu filtering — type `/head` → filters to headings only
- [ ] Drag-to-reorder blocks — move any block anywhere
- [ ] Toggle blocks — expandable/collapsible sections
- [ ] Callout blocks — colored info/warning/tip boxes
- [ ] Cover images on pages
- [ ] Table of contents block
- [ ] Embeds (YouTube, Figma, URLs with preview)
- [ ] Image upload (need storage — Supabase Storage or S3)
- [ ] Keyboard shortcuts shown in menus
- [ ] Better database views — filters, sorts, grouping
- [ ] Undo/redo with collaboration mode
- [ ] Breadcrumb navigation within nested docs
- [ ] Page templates (Meeting Notes, PRD, Sprint Planning)

### Polish
- [ ] Notion-warm light theme refinement
- [ ] Sidebar date grouping (Recents, Earlier)
- [ ] Doc icons — monochrome page icons like Notion
- [ ] Smoother animations and transitions
- [ ] Mobile responsive layout
- [ ] Offline mode with sync on reconnect

## Priority 3: Infrastructure

- [x] Supabase persistence (workspaces, docs, properties)
- [x] Railway backend (permanent URL)
- [x] Vercel frontend
- [x] Clerk auth
- [x] Yjs real-time collaboration
- [ ] Named Cloudflare tunnel or custom domain (grid.ollielabs.com)
- [ ] Supabase Storage for images/files
- [ ] Rate limiting per agent
- [ ] Usage analytics (PostHog or similar)
- [ ] Error tracking (Sentry)

## Priority 4: Growth

- [ ] Landing page with demo video
- [ ] "Connect your first agent in 60 seconds" onboarding flow
- [ ] Agent templates gallery
- [ ] Public workspace directory
- [ ] Blog: "How we built Grid"
- [ ] Twitter/X launch thread
