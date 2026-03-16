export interface StoredDoc {
  id: string;
  workspaceId: string;
  title: string;
  icon: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

let nextId = 4;

const docs: StoredDoc[] = [
  {
    id: 'doc-1',
    workspaceId: 'ws-1',
    title: 'Getting Started',
    icon: '🚀',
    content: `# Welcome to Grid

Grid is a collaborative workspace where humans and AI agents work together on documents in real-time. Think of it as your team's shared brain — where every conversation, decision, and piece of context lives in one place.

## Connect an Agent

Agents join your workspace via WebSocket. Here's a minimal example:

\`\`\`javascript
const ws = new WebSocket("ws://localhost:3001/agent");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "auth",
    agentId: "my-agent",
    name: "Research Bot",
    capabilities: ["read", "write", "comment"]
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log("Received:", msg.type);
};
\`\`\`

## Mention Agents in Comments

You can bring an agent into any conversation by @mentioning it in a comment thread. The agent receives the comment context and can reply, make edits, or ask follow-up questions.

- Select text in a document and add a comment
- Type @ followed by the agent's name
- The agent will be notified and can respond in the thread

## Slash Commands

Type / anywhere in a document to open the command menu. Available commands:

- Headings (H1, H2, H3)
- Bullet list and numbered list
- Code block with syntax highlighting
- Blockquote for callouts
- Task list for checklists

## What's Next

> Grid is in active development. New capabilities like agent approval workflows, multi-workspace support, and plugins are coming soon.`,
    createdAt: '2026-03-10T00:00:00Z',
    updatedAt: '2026-03-14T00:00:00Z',
  },
  {
    id: 'doc-2',
    workspaceId: 'ws-1',
    title: 'Project Roadmap',
    icon: '🗺️',
    content: `# Q2 2026 Roadmap

The next quarter is focused on making Grid production-ready. Here's what we're building:

## Agent Protocol v2

1. Document read/write with granular permissions
2. Structured tool-use responses
3. Streaming edits with operational transforms
4. Agent-to-agent communication channels

## Platform Features

- Multi-workspace support with team-level access control
- Real-time presence indicators showing who's viewing each doc
- Agent approval workflows for high-stakes edits
- Plugin system for custom integrations (Slack, Linear, GitHub)

## Infrastructure

- Persistent Yjs document storage with versioning
- Horizontal scaling for WebSocket connections
- Audit log for all agent actions
- Rate limiting and usage analytics

> Ship fast, stay stable. Every feature gets a design review and a test plan before it lands.`,
    createdAt: '2026-03-11T00:00:00Z',
    updatedAt: '2026-03-14T00:00:00Z',
  },
  {
    id: 'doc-3',
    workspaceId: 'ws-1',
    title: 'API Documentation',
    icon: '📡',
    content: `# Grid API v1.0

## REST Endpoints

- GET /api/workspaces — list all workspaces
- GET /api/workspaces/:id/documents — list documents in a workspace
- POST /api/documents — create a new document
- POST /api/agents — register an agent

## Agent WebSocket Protocol

Connect to the agent gateway at ws://localhost:3001/agent and authenticate:

\`\`\`json
{
  "type": "auth",
  "agentId": "unique-agent-id",
  "name": "My Agent",
  "capabilities": ["read", "write", "comment"]
}
\`\`\`

## Message Types

### From Server to Agent

- doc_update — a document was edited
- comment_mention — agent was @mentioned in a comment
- approval_request — agent action needs human approval

### From Agent to Server

- status — update agent status (online, busy, offline)
- send — send a message or reply to a comment
- doc_edit — make an edit to a document

## Error Handling

All errors return a JSON object with a message field:

\`\`\`json
{ "error": true, "message": "Document not found" }
\`\`\`

> For real-time updates, always prefer the WebSocket connection over polling REST endpoints.`,
    createdAt: '2026-03-12T00:00:00Z',
    updatedAt: '2026-03-14T00:00:00Z',
  },
];

export function getAllDocs(workspaceId?: string): StoredDoc[] {
  if (workspaceId) return docs.filter((d) => d.workspaceId === workspaceId);
  return [...docs];
}

export function getDoc(docId: string): StoredDoc | undefined {
  return docs.find((d) => d.id === docId);
}

export function createDoc(
  title: string,
  content: string,
  icon?: string,
  workspaceId?: string
): StoredDoc {
  const now = new Date().toISOString();
  const doc: StoredDoc = {
    id: `doc-${nextId++}`,
    workspaceId: workspaceId || 'ws-1',
    title,
    icon: icon || '📄',
    content,
    createdAt: now,
    updatedAt: now,
  };
  docs.push(doc);
  return doc;
}

export function updateDoc(
  docId: string,
  updates: Partial<Pick<StoredDoc, 'title' | 'content' | 'icon'>>
): StoredDoc | undefined {
  const doc = docs.find((d) => d.id === docId);
  if (!doc) return undefined;
  if (updates.title !== undefined) doc.title = updates.title;
  if (updates.content !== undefined) doc.content = updates.content;
  if (updates.icon !== undefined) doc.icon = updates.icon;
  doc.updatedAt = new Date().toISOString();
  return doc;
}

export function searchDocs(query: string): Array<{
  docId: string;
  title: string;
  snippet: string;
  score: number;
}> {
  const q = query.toLowerCase();
  const results: Array<{ docId: string; title: string; snippet: string; score: number }> = [];

  for (const doc of docs) {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();

    if (titleLower.includes(q)) score += 10;
    if (contentLower.includes(q)) score += 5;

    if (score === 0) continue;

    // Extract snippet around first match in content
    let snippet = '';
    const idx = contentLower.indexOf(q);
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(doc.content.length, idx + q.length + 40);
      snippet = (start > 0 ? '...' : '') + doc.content.slice(start, end) + (end < doc.content.length ? '...' : '');
    } else {
      snippet = doc.content.slice(0, 80) + (doc.content.length > 80 ? '...' : '');
    }

    results.push({ docId: doc.id, title: doc.title, snippet, score });
  }

  return results.sort((a, b) => b.score - a.score);
}
