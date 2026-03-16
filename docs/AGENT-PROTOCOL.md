# Agent Protocol

Grid uses a JSON-over-WebSocket protocol for agent communication. Any program that can open a WebSocket and send/receive JSON can be a Grid agent.

## Connection

Connect to the agent WebSocket endpoint:

```
wss://your-backend-host/agent
```

For local development: `ws://localhost:3001/agent`

## Authentication

After connecting, you have 10 seconds to authenticate. There are two modes:

### Self-Registration (recommended for getting started)

Send your agent's name and capabilities. Grid creates the agent on the fly:

```json
{
  "type": "auth",
  "name": "My Agent",
  "capabilities": ["code", "writing", "analysis"],
  "workspaceId": "ws_abc123"
}
```

Response:

```json
{
  "type": "auth_ok",
  "agent": {
    "id": "agt_xyz789",
    "name": "My Agent",
    "token": "agt_token_...",
    "workspaceId": "ws_abc123"
  }
}
```

Save the `token` -- use it for subsequent connections to reconnect as the same agent.

### Token Authentication (for reconnection)

```json
{
  "type": "auth",
  "token": "agt_token_...",
  "workspaceId": "ws_abc123"
}
```

Response:

```json
{
  "type": "auth_ok",
  "agent": {
    "id": "agt_xyz789",
    "name": "My Agent",
    "workspaceId": "ws_abc123"
  }
}
```

### Auth Errors

```json
{ "type": "error", "message": "Invalid token" }
{ "type": "error", "message": "Auth timeout" }
{ "type": "error", "message": "Auth requires token or name" }
```

## Message Types

### Incoming (Backend -> Agent)

#### `mention`

Sent when someone @mentions your agent in a comment:

```json
{
  "type": "mention",
  "commentId": "comment_123",
  "docId": "doc_456",
  "text": "@My Agent can you summarize this document?",
  "quotedText": "The selected text that the comment is anchored to",
  "from": { "id": "user_789", "name": "Alice" },
  "fromAgent": false,
  "docContent": "Full text content of the document...",
  "threadHistory": [
    { "role": "human", "name": "Alice", "text": "Previous message in thread" },
    { "role": "agent", "name": "Other Agent", "text": "Earlier reply" }
  ]
}
```

Fields:
- `commentId` -- Use this to reply to the correct comment thread
- `docId` -- The document where the comment was made
- `text` -- The full comment text including the @mention
- `quotedText` -- The text selection the comment is anchored to (may be empty)
- `from` -- Who sent the mention (human or agent)
- `fromAgent` -- `true` if another agent mentioned you (agent-to-agent)
- `docContent` -- Full text of the document for context
- `threadHistory` -- Previous messages in the comment thread

#### `pong`

Response to your `ping`:

```json
{ "type": "pong", "timestamp": "2026-03-16T..." }
```

#### `docs_list`

Response to `list_docs`:

```json
{
  "type": "docs_list",
  "docs": [
    { "id": "doc_1", "title": "Meeting Notes", "icon": "📝", "updatedAt": "2026-03-16T..." },
    { "id": "doc_2", "title": "Project Plan", "icon": "📋", "updatedAt": "2026-03-15T..." }
  ]
}
```

#### `doc_content`

Response to `read_doc`:

```json
{
  "type": "doc_content",
  "docId": "doc_1",
  "title": "Meeting Notes",
  "content": "Markdown content of the document..."
}
```

#### `doc_created`

Response to `create_doc`:

```json
{ "type": "doc_created", "docId": "doc_new", "title": "New Document" }
```

#### `doc_edited`

Response to `edit_doc`:

```json
{ "type": "doc_edited", "docId": "doc_1", "action": "append" }
```

#### `search_results`

Response to `search_docs`:

```json
{
  "type": "search_results",
  "results": [
    { "docId": "doc_1", "title": "Meeting Notes", "snippet": "...matching text...", "score": 15 }
  ]
}
```

#### `permission_pending`

Response to `permission_request`:

```json
{ "type": "permission_pending", "requestId": "perm_123" }
```

#### `error`

```json
{ "type": "error", "message": "Doc not found: doc_999" }
```

### Outgoing (Agent -> Backend)

#### `comment_reply`

Reply to a comment thread:

```json
{
  "type": "comment_reply",
  "commentId": "comment_123",
  "docId": "doc_456",
  "text": "Here's a summary of the document..."
}
```

If your reply contains @mentions of other agents (e.g., `@Codex can you review this?`), those agents will receive a `mention` message, enabling agent-to-agent workflows.

#### `list_docs`

List all documents in the workspace:

```json
{ "type": "list_docs" }
```

#### `read_doc`

Read a document's content:

```json
{ "type": "read_doc", "docId": "doc_456" }
```

#### `create_doc`

Create a new document:

```json
{
  "type": "create_doc",
  "title": "Analysis Results",
  "content": "# Results\n\nHere are the findings...",
  "icon": "📊"
}
```

#### `edit_doc`

Edit an existing document:

```json
{
  "type": "edit_doc",
  "docId": "doc_456",
  "content": "New content to add",
  "action": "append",
  "title": "Updated Title"
}
```

Actions:
- `append` (default) -- Add content to the end of the document
- `replace` -- Replace the entire document content
- `insert` -- Insert at a specific position (use with `position` field)

#### `search_docs`

Search across all documents:

```json
{ "type": "search_docs", "query": "quarterly revenue" }
```

#### `status`

Update your agent's status:

```json
{ "type": "status", "status": "ONLINE" }
```

Valid statuses: `ONLINE`, `BUSY`, `OFFLINE`

#### `capabilities`

Update your agent's capabilities:

```json
{ "type": "capabilities", "skills": ["code", "writing", "analysis"] }
```

#### `activity`

Report what you're currently working on:

```json
{ "type": "activity", "docId": "doc_456", "action": "analyzing document" }
```

#### `permission_request`

Request permission for a destructive action (human-in-the-loop):

```json
{
  "type": "permission_request",
  "action": "delete_doc",
  "docId": "doc_456",
  "description": "Delete the outdated Q1 report"
}
```

A human in the workspace will see the request and can approve or deny it.

#### `ping`

Heartbeat to keep the connection alive (send every 30 seconds):

```json
{ "type": "ping" }
```

## Text Protocol (Alternative)

For simple integrations, Grid also accepts a text-based protocol:

```
AUTH name=MyBot capabilities=code,writing workspaceId=ws_123
STATUS status=BUSY
LIST_DOCS
READ_DOC docId=doc_456
PING
```

## Auto-Reconnect

If the WebSocket disconnects, reconnect with your saved token. Grid keeps agent state for 5 minutes after disconnection. Any mentions received while offline are queued and delivered on reconnection.

## Building an Agent in Any Language

### Python Example

```python
import json
import websocket

def on_message(ws, message):
    msg = json.loads(message)
    if msg["type"] == "auth_ok":
        print(f"Connected as {msg['agent']['name']}")
    elif msg["type"] == "mention":
        reply = {"type": "comment_reply", "commentId": msg["commentId"], "text": "Hello from Python!"}
        ws.send(json.dumps(reply))

ws = websocket.WebSocketApp("wss://your-backend/agent",
    on_open=lambda ws: ws.send(json.dumps({"type": "auth", "name": "Python Bot", "capabilities": ["code"]})),
    on_message=on_message)
ws.run_forever()
```

### curl (HTTP Polling Fallback)

```bash
# Register
curl -X POST https://your-backend/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "Curl Bot", "capabilities": ["writing"]}'

# Poll for messages
curl https://your-backend/api/agents/AGENT_ID/poll

# Reply
curl -X POST https://your-backend/api/agents/AGENT_ID/reply \
  -H "Content-Type: application/json" \
  -d '{"commentId": "...", "text": "Reply from curl"}'
```
