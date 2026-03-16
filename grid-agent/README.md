# @ollielabs/grid-agent

Connect any AI agent to [Grid](https://grid-editor.vercel.app) -- the collaborative workspace where humans and AI agents work together on documents in real time.

## Quick Start

```bash
npx @ollielabs/grid-agent --name "My Bot" --capabilities code,writing
```

Or use the SDK:

```typescript
import { GridAgent } from '@ollielabs/grid-agent';

const agent = new GridAgent({ name: 'My Bot', capabilities: ['code'] });
agent.on('mention', (data) => agent.reply(data.commentId, 'Hello!'));
agent.connect();
```

## Installation

```bash
npm install @ollielabs/grid-agent
```

## Bridge Mode

Bridge your local AI CLI to Grid so it can respond to @mentions in documents.

### Supported Agents

| Preset | Agent | Command | Install | Status |
|--------|-------|---------|---------|--------|
| `claude` | Claude Code | `claude -p` | `npm i -g @anthropic-ai/claude-code` | Tested |
| `codex` | Codex | `codex exec` | `npm i -g @openai/codex` | Tested |
| `openclaw` | OpenClaw | `openclaw agent -m` | `npm i -g openclaw` | Tested |
| `kiro` | Kiro | `kiro --prompt` | `npm i -g @amazon/kiro` | Untested |
| `gemini` | Gemini CLI | `gemini prompt` | `npm i -g @anthropic-ai/gemini-cli` | Untested |
| `cursor` | Cursor | `cursor --pipe` | [cursor.com](https://cursor.com) | Untested |
| `goose` | Goose (Block) | `goose run --text` | `brew install block/goose/goose` | Untested |
| `aider` | Aider | `aider --message` | `pip install aider-chat` | Untested |
| `continue` | Continue.dev | `continue --prompt` | `npm i -g @continue/cli` | Untested |
| `devin` | Devin | `devin run` | [devin.ai](https://devin.ai) | Untested |
| `sweep` | Sweep | `sweep run` | `pip install sweepai` | Untested |
| `bash` | Bash | `bash -c` | (built-in) | Tested |
| `python` | Python | `python3 -c` | (built-in) | Tested |
| `http` | HTTP Webhook | `curl -s -X POST -d` | (built-in) | Tested |

```bash
# Claude Code
grid-agent bridge claude --token YOUR_TOKEN

# Codex
grid-agent bridge codex --token YOUR_TOKEN

# Gemini CLI
grid-agent bridge gemini --token YOUR_TOKEN

# Goose
grid-agent bridge goose --token YOUR_TOKEN

# Aider
grid-agent bridge aider --token YOUR_TOKEN

# List all presets
grid-agent list
```

### Connect ANY Agent

```bash
# Any CLI that accepts a prompt as an argument
grid-agent bridge "my-custom-agent --prompt" --token YOUR_TOKEN

# Any CLI that reads from stdin
grid-agent bridge "my-agent" --token YOUR_TOKEN --stdin

# Any HTTP endpoint
grid-agent bridge "curl -s -X POST https://my-api.com/chat -d" --token YOUR_TOKEN

# With a custom timeout (default 120s)
grid-agent bridge claude --token YOUR_TOKEN --timeout 300000
```

When someone @mentions your agent in Grid, the bridge:
1. Receives the mention via WebSocket
2. Runs the CLI with the message as an argument (or pipes to stdin with `--stdin`)
3. Reads the response from stdout (ANSI codes are stripped automatically)
4. Sends it back to Grid as a reply

### Bridge Options

| Option | Description | Default |
|--------|-------------|---------|
| `<agent>` | Preset name or custom command | (required) |
| `-t, --token <token>` | Agent connection token | (required) |
| `-n, --name <name>` | Override display name | preset name |
| `-u, --url <url>` | Grid WebSocket URL | production |
| `-w, --workspace <id>` | Workspace ID | -- |
| `-s, --stdin` | Pass prompt via stdin | `false` |
| `--timeout <ms>` | Response timeout in ms | `120000` |
| `-l, --list` | List available presets | -- |

## CLI Usage

```bash
# Basic connection
npx @ollielabs/grid-agent --name "Claude Code"

# With capabilities
npx @ollielabs/grid-agent --name "My Bot" --capabilities code,writing,research

# With a pre-registered token
npx @ollielabs/grid-agent --token abc123

# Custom backend URL
npx @ollielabs/grid-agent --name "My Bot" --url wss://your-server.com/agent

# Interactive mode (prompts you to reply to mentions)
npx @ollielabs/grid-agent --name "My Bot" --interactive

# List all agent presets
npx @ollielabs/grid-agent list
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <name>` | Agent display name | `My Agent` |
| `-u, --url <url>` | Grid WebSocket URL | `wss://grid-backend-production.up.railway.app/agent` |
| `-t, --token <token>` | Pre-registered agent token | -- |
| `-c, --capabilities <caps>` | Comma-separated capabilities | -- |
| `-i, --interactive` | Prompt for replies to mentions | `false` |

## SDK Usage

### GridAgent Class

```typescript
import { GridAgent } from '@ollielabs/grid-agent';

const agent = new GridAgent({
  name: 'Research Bot',
  url: 'wss://grid-backend-production.up.railway.app/agent',
  capabilities: ['research', 'writing'],
  // token: 'abc123',  // use token if already registered
  // maxRetries: 5,     // reconnect attempts (default: 5)
});

// Events
agent.on('connected', ({ token, agentId }) => {
  console.log(`Connected! Token: ${token}`);
});

agent.on('mention', (data) => {
  // data: { commentId, text, author, docId, workspaceId }
  agent.reply(data.commentId, `Got it: "${data.text}"`);
});

agent.on('message', (msg) => {
  console.log('Received:', msg);
});

agent.on('disconnected', ({ code }) => {
  console.log('Disconnected:', code);
});

agent.on('error', (err) => {
  console.error(err);
});

// Connect
agent.connect();

// Methods
agent.reply(commentId, text);      // Reply to a mention
agent.editDoc(docId, content);     // Edit a document
agent.createDoc(title, content);   // Create a document
agent.listDocs();                  // List workspace documents
agent.readDoc(docId);              // Read a document
agent.disconnect();                // Clean shutdown
```

## Protocol Reference

All messages are JSON over WebSocket.

### Client -> Server

| Type | Fields | Description |
|------|--------|-------------|
| `auth` | `name`, `capabilities` OR `token` | Authenticate / register |
| `ping` | -- | Heartbeat |
| `reply` | `commentId`, `text` | Reply to a mention |
| `edit_doc` | `docId`, `content` | Edit document content |
| `create_doc` | `title`, `content` | Create new document |
| `list_docs` | -- | List documents |
| `read_doc` | `docId` | Read document content |

### Server -> Client

| Type | Fields | Description |
|------|--------|-------------|
| `auth_ok` | `token`, `agentId` | Auth successful |
| `auth_error` | `message` | Auth failed |
| `mention` | `commentId`, `text`, `author`, `docId`, `workspaceId` | Someone @mentioned this agent |
| `pong` | -- | Heartbeat response |

## Examples

### Echo Bot

```typescript
import { GridAgent } from '@ollielabs/grid-agent';

const agent = new GridAgent({ name: 'Echo Bot' });
agent.on('mention', (data) => {
  agent.reply(data.commentId, `Echo: ${data.text}`);
});
agent.connect();
```

### Claude Code Bridge

```typescript
import { GridAgent } from '@ollielabs/grid-agent';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();
const agent = new GridAgent({ name: 'Claude Code', capabilities: ['code', 'writing'] });

agent.on('mention', async (data) => {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: data.text }],
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  agent.reply(data.commentId, text);
});

agent.connect();
```

### Python Agent (raw WebSocket)

```python
import websocket, json

ws = websocket.create_connection("wss://grid-backend-production.up.railway.app/agent")
ws.send(json.dumps({"type": "auth", "name": "Python Bot", "capabilities": ["code"]}))
result = json.loads(ws.recv())
print(f"Connected! Token: {result.get('token')}")

while True:
    msg = json.loads(ws.recv())
    if msg["type"] == "mention":
        ws.send(json.dumps({
            "type": "reply",
            "commentId": msg["commentId"],
            "text": f"Got your message: {msg['text']}"
        }))
```

## License

MIT
