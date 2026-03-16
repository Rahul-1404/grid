# Contributing to Grid

Thanks for your interest in contributing to Grid! Here's how to get started.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)
- A Clerk account (free tier works)

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/grid.git
cd grid
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
CLERK_SECRET_KEY=your-clerk-secret
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

Start the frontend:

```bash
npm run dev
```

### 4. Agent SDK (optional)

```bash
cd grid-agent
npm install
npm run build
npm link  # makes grid-agent CLI available globally
```

## Making Changes

### Workflow

1. Create a branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Test locally (frontend + backend running)
4. Commit with a descriptive message
5. Push and open a PR

### Branch Naming

- `feat/` -- New features
- `fix/` -- Bug fixes
- `docs/` -- Documentation
- `refactor/` -- Code refactoring

### Commit Messages

Use clear, concise commit messages:

```
Add agent cursor presence in editor
Fix offline message queue not delivering on reconnect
Update ARCHITECTURE.md with Supabase schema
```

## Project Structure

```
grid/
├── frontend/        React + Vite + Tiptap + Yjs
│   └── src/
│       ├── components/
│       │   ├── editor/     Block editor
│       │   ├── panel/      Comments panel
│       │   ├── sidebar/    Navigation + agent panel
│       │   └── modals/     Dialogs
│       ├── stores/         Zustand state management
│       ├── lib/            Supabase client, utilities
│       └── types/          TypeScript types
├── backend/         Express + Socket.io + WebSocket
│   └── src/
│       ├── index.ts            Server entry point
│       ├── agent-gateway.ts    Agent WebSocket server
│       ├── agent-registry.ts   Agent state management
│       ├── comment-bridge.ts   @mention routing
│       ├── doc-store.ts        Document CRUD
│       ├── yjs-server.ts       Yjs document management
│       └── routes/             REST API routes
└── grid-agent/      npm SDK + CLI
    └── src/
        ├── client.ts    GridAgent WebSocket client
        ├── bridge.ts    CLI-to-Grid bridge
        ├── cli.ts       Commander CLI
        └── presets.ts   Agent presets
```

## Areas for Contribution

Check the [ROADMAP.md](../ROADMAP.md) for planned features. Some good first issues:

- **Slash menu filtering** -- Type `/head` to filter to headings only
- **Drag-to-reorder blocks** -- Move any block in the editor
- **Toggle blocks** -- Expandable/collapsible sections
- **Mobile responsive layout**
- **Agent SDK examples** -- Python, Go, Rust implementations of the agent protocol
- **Tests** -- Unit tests for the comment bridge, agent registry, and SDK

## Code Style

- TypeScript throughout
- Functional components with hooks (React)
- Zustand for state management
- Tailwind CSS for styling (no CSS-in-JS)
- ESLint + Prettier (run `npm run lint` if configured)

## Questions?

Open an issue or start a discussion on GitHub. We're happy to help!
