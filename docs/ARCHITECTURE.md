# Architecture

Grid is a monorepo with three packages: a React frontend, an Express backend, and a TypeScript agent SDK/CLI.

## System Overview

```
+------------------+       Socket.io        +------------------+
|                  | <--------------------> |                  |
|  Frontend        |    Yjs WebSocket       |  Backend         |
|  (React + Vite)  | <--------------------> |  (Express)       |
|                  |    /yjs/:docId         |                  |
+------------------+                        +------------------+
                                                    |
                                            Agent WebSocket
                                              /agent
                                                    |
                                            +------------------+
                                            |  Agent SDK/CLI   |
                                            |  grid-agent      |
                                            +------------------+
                                                    |
                                            +------------------+
                                            |  AI CLI          |
                                            |  (claude, codex, |
                                            |   gemini, etc.)  |
                                            +------------------+
```

## Frontend

**Stack:** React, Vite, Tiptap (block editor), Yjs (CRDT), Tailwind CSS, Clerk (auth), Supabase (persistence)

### Key Modules

- **Editor** (`frontend/src/components/editor/`) -- Tiptap block editor with custom extensions for slash commands, mentions, and collaboration cursors.
- **Comments Panel** (`frontend/src/components/panel/`) -- Google Docs-style comment sidebar. Inline comments anchored to text selections with @mention support.
- **Sidebar** (`frontend/src/components/sidebar/`) -- Workspace navigation, document list, agent status panel, and settings.
- **Stores** (`frontend/src/stores/`) -- Zustand stores for workspace state, documents, comments, and agent status.

### Communication

1. **Socket.io** -- Used for real-time events: agent status updates, comment notifications, document creation/deletion, permission requests.
2. **Yjs WebSocket** -- Dedicated WebSocket connection per document at `/yjs/:docId` for CRDT-based real-time collaboration. Every keystroke syncs instantly.
3. **Supabase** -- Direct client access for workspace CRUD, document persistence, member management, and invite links.
4. **Clerk** -- Authentication provider. Users sign in via Clerk, and the Clerk user ID is used as the workspace member identity.

## Backend

**Stack:** Express, Socket.io, WebSocket (ws library), Yjs, Supabase

### Entry Point

`backend/src/index.ts` creates a single HTTP server with three upgrade paths:

- **Socket.io** -- Default path, handles browser client connections
- **`/agent`** -- Agent WebSocket gateway for AI agent connections
- **`/yjs/:docId`** -- Yjs document sync WebSocket

### Key Modules

- **Agent Gateway** (`agent-gateway.ts`) -- WebSocket server for agents. Handles auth (token-based and self-registration), message routing, and all agent operations (read/edit/create docs, search, status updates).
- **Agent Registry** (`agent-registry.ts`) -- In-memory registry of connected agents. Tracks status, capabilities, workspace assignment, offline message queue, and WebSocket connections.
- **Comment Bridge** (`comment-bridge.ts`) -- Routes @mentions from comments to the correct agent. Parses mention text, matches agent names, delivers via WebSocket, and queues for offline agents.
- **Doc Store** (`doc-store.ts`) -- Document metadata management with Supabase persistence.
- **Yjs Server** (`yjs-server.ts`) -- Manages Yjs documents in memory, handles sync protocol, and provides text extraction for agent context.
- **Socket Handler** (`socket-handler.ts`) -- Socket.io event handlers for browser clients: workspace room management, comment CRUD, permission approvals.

### REST API

- `GET/POST /api/agents` -- Agent registration and listing
- `GET /api/agent-codes/:code` -- Resolve agent join codes
- `GET/POST /api/workspaces` -- Workspace CRUD
- `POST /api/invite` -- Send workspace invites via Clerk
- `GET /api/health` -- Health check

## Agent SDK (`grid-agent/`)

**Package:** `@ollielabs/grid-agent` on npm

### Components

1. **GridAgent Client** (`client.ts`) -- TypeScript WebSocket client with auto-reconnect, heartbeat, and event emitter API. Supports `connect()`, `reply()`, `editDoc()`, `createDoc()`, `listDocs()`, `readDoc()`.

2. **Bridge** (`bridge.ts`) -- Connects any local CLI tool to Grid. Receives @mentions via WebSocket, spawns the CLI with the mention text as input, captures stdout, and posts the response as a comment reply.

3. **CLI** (`cli.ts`) -- Command-line interface with three modes:
   - `grid-agent connect` -- Raw WebSocket connection with optional interactive mode
   - `grid-agent bridge <agent>` -- Bridge a local AI CLI (claude, codex, etc.) to Grid
   - `grid-agent join <code>` -- One-command join with auto-detection of installed agents

4. **Presets** (`presets.ts`) -- 14+ preconfigured agent definitions (command, args, capabilities) for popular AI CLIs.

## Supabase Schema

### Tables

- **workspaces** -- `id`, `name`, `owner_id`, `created_at`
- **documents** -- `id`, `workspace_id`, `title`, `icon`, `content` (JSON), `created_at`, `updated_at`
- **workspace_members** -- `workspace_id`, `user_id`, `role` (owner/editor/viewer), `joined_at`
- **workspace_agents** -- `workspace_id`, `agent_id`, `name`, `token`, `capabilities`, `created_at`
- **workspace_invites** -- `id`, `workspace_id`, `code`, `created_by`, `expires_at`

## How @Mentions Route Through the System

1. User types a comment with `@Claude Code help me refactor this` in the frontend.
2. Frontend emits `comment:create` via Socket.io with the comment text and quoted text selection.
3. Backend `socket-handler.ts` receives the event and calls `routeCommentToAgents()` in `comment-bridge.ts`.
4. Comment bridge scans the text for agent name patterns (`@claude-code`, `@claudecode`, `@claude code`).
5. If a matching agent is connected, the bridge sends a `mention` message via WebSocket with the comment text, doc content, and thread history.
6. If the agent is offline, the message is queued in the agent registry. When the agent reconnects, queued messages are delivered.
7. The agent (or bridge) processes the mention and sends back a `comment_reply` message.
8. Backend broadcasts the reply via Socket.io to all browser clients in the workspace.
9. If the reply contains @mentions of other agents, the comment bridge routes those too (agent-to-agent chains).

## How the Bridge CLI Works

```
Terminal                        Grid Backend                    Browser
  |                                 |                              |
  | grid-agent bridge claude        |                              |
  |   --join abc123                 |                              |
  |                                 |                              |
  |-- GET /api/agent-codes/abc123 ->|                              |
  |<- { token, url, workspaceId } --|                              |
  |                                 |                              |
  |-- WebSocket /agent ------------>|                              |
  |-- { type: "auth", token } ----->|                              |
  |<- { type: "auth_ok" } ---------|                              |
  |                                 |-- agent:status ------------->|
  |                                 |   (agent appears in sidebar) |
  |                                 |                              |
  |   ... waiting for mentions ...  |                              |
  |                                 |                              |
  |                                 |<- comment with @Claude ------|
  |<- { type: "mention", text } ----|                              |
  |                                 |                              |
  |-- spawn: claude -p "text" ----> (local Claude Code process)    |
  |<- stdout response -------------|                              |
  |                                 |                              |
  |-- { type: "comment_reply" } --->|                              |
  |                                 |-- comment:reply ------------>|
  |                                 |   (reply appears in thread)  |
```

The bridge spawns a fresh process for each mention (one-shot mode), captures stdout, strips ANSI codes, and posts the response. Timeout defaults to 120 seconds.
