#!/usr/bin/env node
/**
 * Grid ACP Bridge
 *
 * Connects any ACP-compatible agent (Claude Code, Codex, Kiro, etc.)
 * to a Grid workspace via WebSocket.
 *
 * Usage:
 *   node bridge.mjs --agent claude --workspace ws-1
 *   node bridge.mjs --agent "npx claude-code" --workspace ws-1
 *   node bridge.mjs --command "claude" --name "Claude Code"
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { createInterface } from 'readline';

const GRID_API = process.env.GRID_API || 'http://localhost:3001';
const GRID_WS = process.env.GRID_WS || 'ws://localhost:3001/agent';

// Parse args
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
};

const AGENT_PRESETS = {
  'claude': { command: 'claude', args: ['--acp'], name: 'Claude Code' },
  'claude-code': { command: 'claude', args: ['--acp'], name: 'Claude Code' },
  'codex': { command: 'codex', args: ['--acp'], name: 'Codex' },
  'kiro': { command: 'kiro', args: ['--acp'], name: 'Kiro CLI' },
  'gemini': { command: 'gemini', args: ['--acp'], name: 'Gemini CLI' },
  'goose': { command: 'goose', args: ['--acp'], name: 'Goose' },
};

const agentPreset = getArg('agent');
const customCommand = getArg('command');
const agentName = getArg('name') || (agentPreset && AGENT_PRESETS[agentPreset]?.name) || 'ACP Agent';
const cwd = getArg('cwd') || process.cwd();

let agentCommand, agentArgs;
if (agentPreset && AGENT_PRESETS[agentPreset]) {
  agentCommand = AGENT_PRESETS[agentPreset].command;
  agentArgs = AGENT_PRESETS[agentPreset].args;
} else if (customCommand) {
  const parts = customCommand.split(' ');
  agentCommand = parts[0];
  agentArgs = [...parts.slice(1), '--acp'];
} else {
  console.log(`
Grid ACP Bridge — Connect any ACP agent to your Grid workspace

Usage:
  node bridge.mjs --agent claude          # Connect Claude Code
  node bridge.mjs --agent codex           # Connect Codex
  node bridge.mjs --agent kiro            # Connect Kiro CLI
  node bridge.mjs --command "my-agent"    # Connect custom agent

Options:
  --agent <preset>    Agent preset (claude, codex, kiro, gemini, goose)
  --command <cmd>     Custom agent command
  --name <name>       Agent display name
  --cwd <path>        Working directory (default: current)
  --workspace <id>    Grid workspace ID
  `);
  process.exit(0);
}

console.log(`🔌 Grid ACP Bridge`);
console.log(`   Agent: ${agentName} (${agentCommand} ${agentArgs.join(' ')})`);
console.log(`   CWD: ${cwd}`);
console.log(`   Grid: ${GRID_API}`);
console.log('');

// --- ACP Client (talks to agent subprocess via stdio) ---

let acpProcess = null;
let acpRequestId = 0;
let acpPendingRequests = new Map(); // id -> { resolve, reject }
let sessionId = null;

function spawnAgent() {
  console.log(`🚀 Spawning ${agentCommand} ${agentArgs.join(' ')}...`);

  acpProcess = spawn(agentCommand, agentArgs, {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Read stdout line by line (ACP messages are newline-delimited JSON-RPC)
  const rl = createInterface({ input: acpProcess.stdout });
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      handleAcpMessage(msg);
    } catch (e) {
      // Not JSON — ignore (could be agent log output)
    }
  });

  // Log stderr
  acpProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.log(`[agent stderr] ${text}`);
  });

  acpProcess.on('close', (code) => {
    console.log(`❌ Agent process exited with code ${code}`);
    process.exit(1);
  });

  acpProcess.on('error', (err) => {
    console.error(`❌ Failed to spawn agent: ${err.message}`);
    console.log(`   Make sure '${agentCommand}' is installed and in your PATH`);
    process.exit(1);
  });
}

function sendAcpRequest(method, params = {}) {
  const id = ++acpRequestId;
  const msg = { jsonrpc: '2.0', id, method, params };
  acpProcess.stdin.write(JSON.stringify(msg) + '\n');

  return new Promise((resolve, reject) => {
    acpPendingRequests.set(id, { resolve, reject });
    // Timeout after 30s
    setTimeout(() => {
      if (acpPendingRequests.has(id)) {
        acpPendingRequests.delete(id);
        reject(new Error(`ACP request ${method} timed out`));
      }
    }, 30000);
  });
}

function handleAcpMessage(msg) {
  // Response to a request we sent
  if (msg.id !== undefined && acpPendingRequests.has(msg.id)) {
    const { resolve, reject } = acpPendingRequests.get(msg.id);
    acpPendingRequests.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
    return;
  }

  // Notification from agent (session/update)
  if (msg.method === 'session/update') {
    handleSessionUpdate(msg.params);
    return;
  }

  // Permission request
  if (msg.method === 'session/request_permission') {
    // Auto-approve for now (in production, route to Grid UI for human approval)
    console.log(`🔐 Permission requested: ${JSON.stringify(msg.params)}`);
    // Send approval
    const response = { jsonrpc: '2.0', id: msg.id, result: { approved: true } };
    acpProcess.stdin.write(JSON.stringify(response) + '\n');
    return;
  }
}

let currentPromptResolve = null;
let currentResponseText = '';

function handleSessionUpdate(params) {
  if (!params) return;

  const { type } = params;

  if (type === 'agent_message_chunk') {
    // Streaming text from agent
    const text = params.data?.text || params.text || '';
    currentResponseText += text;
    process.stdout.write(text); // Show streaming in terminal
  }

  if (type === 'tool_call') {
    console.log(`\n🔧 Tool call: ${params.name || params.data?.name || 'unknown'}`);
  }

  if (type === 'tool_call_update') {
    if (params.status === 'completed') {
      console.log(`   ✅ Tool completed`);
    }
  }

  if (type === 'turn_complete' || type === 'end_turn') {
    console.log('\n');
    if (currentPromptResolve) {
      currentPromptResolve(currentResponseText);
      currentPromptResolve = null;
      currentResponseText = '';
    }
  }
}

async function initializeAgent() {
  console.log('📡 Initializing ACP connection...');
  const result = await sendAcpRequest('initialize', {});
  console.log(`   Protocol version: ${result?.protocolVersion || 'unknown'}`);
  console.log(`   Capabilities: ${JSON.stringify(result?.agentCapabilities || {})}`);
  return result;
}

async function createSession() {
  console.log('📋 Creating session...');
  const result = await sendAcpRequest('session/new', { cwd });
  sessionId = result?.sessionId;
  console.log(`   Session: ${sessionId}`);
  return sessionId;
}

async function sendPrompt(text) {
  return new Promise((resolve) => {
    currentResponseText = '';
    currentPromptResolve = resolve;

    sendAcpRequest('session/prompt', {
      sessionId,
      prompt: [{ type: 'text', text }],
    }).then((result) => {
      // If the result comes back directly (non-streaming)
      if (result && currentPromptResolve) {
        const text = result?.content?.[0]?.text || currentResponseText || '';
        currentPromptResolve(text);
        currentPromptResolve = null;
        currentResponseText = '';
      }
    }).catch((err) => {
      console.error(`Prompt error: ${err.message}`);
      resolve(currentResponseText || `Error: ${err.message}`);
      currentPromptResolve = null;
    });
  });
}

// --- Grid WebSocket Client (connects bridge to Grid workspace) ---

let gridWs = null;
let gridToken = null;
let gridAgentId = null;

async function registerWithGrid() {
  console.log('🌐 Registering with Grid...');
  const res = await fetch(`${GRID_API}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: agentName, capabilities: ['code', 'debugging', 'architecture', 'writing'] }),
  });
  const data = await res.json();
  gridAgentId = data.id;
  gridToken = data.token;
  console.log(`   Registered as ${gridAgentId}`);
  return data;
}

async function connectToGrid() {
  return new Promise((resolve) => {
    gridWs = new WebSocket(`${GRID_WS}?token=${gridToken}`);

    gridWs.on('open', () => {
      gridWs.send(JSON.stringify({ type: 'auth', token: gridToken }));
    });

    gridWs.on('message', async (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'auth_ok') {
        console.log(`🟢 Connected to Grid as "${msg.agent.name}"`);
        gridWs.send(JSON.stringify({ type: 'capabilities', skills: ['code', 'debugging', 'architecture', 'writing'] }));
        gridWs.send(JSON.stringify({ type: 'status', status: 'ONLINE' }));
        resolve();
      }

      if (msg.type === 'mention') {
        console.log(`\n💬 @mentioned by ${msg.from?.name}: "${msg.text}"`);
        console.log(`📝 Context: "${msg.quotedText}"`);

        // Set busy
        gridWs.send(JSON.stringify({ type: 'status', status: 'BUSY' }));

        // Send to ACP agent
        const prompt = `A user highlighted this text in a document:\n"${msg.quotedText}"\n\nThey commented: "${msg.text}"\n\nRespond helpfully and concisely (2-3 sentences).`;

        try {
          const reply = await sendPrompt(prompt);

          gridWs.send(JSON.stringify({
            type: 'comment_reply',
            docId: msg.docId,
            commentId: msg.commentId,
            text: reply.trim(),
          }));
          console.log(`✍️  Replied via ACP agent`);
        } catch (err) {
          console.error(`❌ Error: ${err.message}`);
          gridWs.send(JSON.stringify({
            type: 'comment_reply',
            docId: msg.docId,
            commentId: msg.commentId,
            text: `Error getting response: ${err.message}`,
          }));
        }

        // Back to online
        gridWs.send(JSON.stringify({ type: 'status', status: 'ONLINE' }));
      }
    });

    gridWs.on('close', () => {
      console.log('❌ Disconnected from Grid');
    });
  });
}

// --- Main ---

async function main() {
  // 1. Spawn the ACP agent subprocess
  spawnAgent();
  await new Promise(r => setTimeout(r, 2000)); // Give agent time to start

  // 2. Initialize ACP
  try {
    await initializeAgent();
    await createSession();
  } catch (err) {
    console.error(`❌ ACP init failed: ${err.message}`);
    console.log('   The agent may not support ACP yet. Falling back to direct mode.');
    // Could fall back to simpler integration here
  }

  // 3. Register with Grid + connect
  await registerWithGrid();
  await connectToGrid();

  console.log('');
  console.log('✨ Bridge is running! The agent is now a participant in your Grid workspace.');
  console.log('   @mention it in a comment to interact.');
  console.log('   Press Ctrl+C to disconnect.');
}

main().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
