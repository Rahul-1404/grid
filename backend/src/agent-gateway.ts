import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import {
  getAgentByToken,
  getAgentByName,
  registerAgent,
  setAgentWs,
  setAgentWorkspace,
  updateAgentStatus,
  updateAgentCapabilities,
  updateAgentActivity,
  handleAgentDisconnect,
  sendToAgent,
  serializeAgent,
  createPermissionRequest,
  setOnStatusChange,
  type ConnectedAgent,
} from './agent-registry.js';
import { getAllDocs, getDoc, createDoc, updateDoc } from './doc-store.js';
import { routeCommentToAgents } from './comment-bridge.js';
import { getYDoc, getYDocText, getYDocMarkdown, createYjsDoc, applyYjsUpdate, insertTextToYDoc } from './yjs-server.js';
import { yDocToText } from './yjs-utils.js';
import * as encoding from 'lib0/encoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import { broadcastToYjsClients } from './yjs-broadcast.js';

let socketIOBroadcast: ((event: string, data: unknown, workspaceId?: string) => void) | null = null;

export function setSocketIOBroadcast(fn: (event: string, data: unknown, workspaceId?: string) => void) {
  socketIOBroadcast = fn;
}

function notifyClients(event: string, data: unknown, workspaceId?: string) {
  if (socketIOBroadcast) socketIOBroadcast(event, data, workspaceId);
}

// Wire up status change notifications
setOnStatusChange((agent) => {
  notifyClients('agent:status', serializeAgent(agent), agent.workspaceId);
});

/** Parse a message — supports JSON and simple text protocol */
function parseMessage(raw: Buffer | string): any {
  const str = raw.toString().trim();

  // Try JSON first
  try {
    return JSON.parse(str);
  } catch {}

  // Simple text protocol: "COMMAND key=value key=value"
  // e.g., "AUTH token=agt_token_abc123"
  // e.g., "SEND channelId=general text=Hello world"
  // e.g., "STATUS status=BUSY"
  const parts = str.split(/\s+/);
  if (parts.length === 0) return null;

  const command = parts[0].toLowerCase();
  const params: Record<string, string> = {};

  // Parse key=value pairs; last key gets rest of string for text values
  for (let i = 1; i < parts.length; i++) {
    const eqIdx = parts[i].indexOf('=');
    if (eqIdx > 0) {
      const key = parts[i].slice(0, eqIdx);
      // For the last key, grab everything after it
      const value = parts[i].slice(eqIdx + 1);
      params[key] = value;
    }
  }

  // Map text commands to JSON message types
  switch (command) {
    case 'auth':
      return { type: 'auth', token: params.token, name: params.name, capabilities: params.capabilities?.split(','), workspaceId: params.workspaceId };
    case 'status':
      return { type: 'status', status: params.status };
    case 'send':
      return { type: 'send', channelId: params.channelId, text: params.text };
    case 'list_docs':
      return { type: 'list_docs', workspaceId: params.workspaceId };
    case 'read_doc':
      return { type: 'read_doc', docId: params.docId };
    case 'ping':
      return { type: 'ping' };
    default:
      return null;
  }
}

function handleAgentMessage(ws: WebSocket, agent: ConnectedAgent, msg: any) {
  agent.lastActivity = new Date();
  const wsId = agent.workspaceId;

  switch (msg.type) {
    case 'capabilities':
      updateAgentCapabilities(agent.id, msg.skills || []);
      notifyClients('agent:status', serializeAgent(agent), wsId);
      break;

    case 'status':
      updateAgentStatus(agent.id, msg.status);
      notifyClients('agent:status', serializeAgent(agent), wsId);
      break;

    case 'activity':
      updateAgentActivity(agent.id, msg.docId, msg.action);
      notifyClients('agent:status', serializeAgent(agent), wsId);
      break;

    case 'send':
      notifyClients('agent:message', {
        agentId: agent.id,
        agentName: agent.name,
        channelId: msg.channelId,
        text: msg.text,
        timestamp: new Date().toISOString(),
      }, wsId);
      break;

    case 'comment_reply':
      notifyClients('comment:reply', {
        docId: msg.docId,
        commentId: msg.commentId,
        reply: {
          id: `reply-${Date.now()}`,
          commentId: msg.commentId,
          text: msg.text,
          author: { id: agent.id, name: agent.name, status: 'online', color: '#8B5CF6', capabilities: agent.capabilities },
          isAgent: true,
          createdAt: new Date().toISOString(),
        },
      }, wsId);
      // Route agent replies through comment-bridge for agent-to-agent @mention chains
      routeCommentToAgents({
        id: msg.commentId,
        documentId: msg.docId,
        text: msg.text,
        quotedText: '',
        author: { id: agent.id, name: agent.name },
      });
      break;

    case 'approval_request':
      notifyClients('approval:request', {
        agentId: agent.id,
        agentName: agent.name,
        action: msg.action,
        details: msg.details,
        timestamp: new Date().toISOString(),
      }, wsId);
      break;

    case 'permission_request': {
      const permReq = createPermissionRequest(
        agent.id,
        agent.name,
        msg.action,
        msg.docId,
        msg.description,
      );
      ws.send(JSON.stringify({ type: 'permission_pending', requestId: permReq.id }));
      notifyClients('permission:request', {
        id: permReq.id,
        agentId: agent.id,
        agentName: agent.name,
        action: msg.action,
        docId: msg.docId,
        description: msg.description || msg.action,
        timestamp: permReq.timestamp,
      }, wsId);
      break;
    }

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      break;

    case 'list_docs': {
      const docs = getAllDocs(msg.workspaceId);
      ws.send(JSON.stringify({
        type: 'docs_list',
        docs: docs.map((d) => ({ id: d.id, title: d.title, icon: d.icon, updatedAt: d.updatedAt })),
      }));
      break;
    }

    case 'read_doc': {
      const doc = getDoc(msg.docId);
      if (!doc) {
        ws.send(JSON.stringify({ type: 'error', message: `Doc not found: ${msg.docId}` }));
      } else {
        const content = getYDocMarkdown(msg.docId);
        ws.send(JSON.stringify({ type: 'doc_content', docId: doc.id, title: doc.title, content }));
      }
      break;
    }

    case 'create_doc': {
      const newDoc = createDoc(msg.title, msg.content || '', msg.icon);
      if (msg.content) {
        createYjsDoc(newDoc.id, msg.content);
      }
      ws.send(JSON.stringify({ type: 'doc_created', docId: newDoc.id, title: newDoc.title }));
      notifyClients('doc:created', {
        doc: {
          id: newDoc.id,
          title: newDoc.title,
          icon: newDoc.icon,
          createdAt: newDoc.createdAt,
          updatedAt: newDoc.updatedAt,
        },
      }, wsId);
      notifyClients('doc:activity', {
        agentName: agent.name,
        action: 'created',
        docTitle: newDoc.title,
      }, wsId);
      break;
    }

    case 'edit_doc': {
      const existing = getDoc(msg.docId);
      if (!existing) {
        ws.send(JSON.stringify({ type: 'error', message: `Doc not found: ${msg.docId}` }));
        break;
      }
      const action: string = msg.action || 'append';

      // Track agent activity
      updateAgentActivity(agent.id, msg.docId, `editing (${action})`);

      // Set agent awareness (cursor presence) before editing
      const editYdoc = getYDoc(msg.docId);
      const agentAwareness = new awarenessProtocol.Awareness(editYdoc);
      const agentClientId = agentAwareness.clientID;
      agentAwareness.setLocalStateField('user', {
        name: agent.name,
        color: '#8B5CF6',
      });
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(agentAwareness, [agentClientId]);
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, 1);
      encoding.writeVarUint8Array(awarenessEncoder, awarenessUpdate);
      broadcastToYjsClients(msg.docId, encoding.toUint8Array(awarenessEncoder));

      applyYjsUpdate(msg.docId, (ydoc) => {
        insertTextToYDoc(ydoc, msg.content, action as 'append' | 'replace' | 'insert', msg.position);
      });

      setTimeout(() => {
        awarenessProtocol.removeAwarenessStates(agentAwareness, [agentClientId], 'edit complete');
        const clearUpdate = awarenessProtocol.encodeAwarenessUpdate(agentAwareness, [agentClientId]);
        const clearEncoder = encoding.createEncoder();
        encoding.writeVarUint(clearEncoder, 1);
        encoding.writeVarUint8Array(clearEncoder, clearUpdate);
        broadcastToYjsClients(msg.docId, encoding.toUint8Array(clearEncoder));
        agentAwareness.destroy();
        updateAgentActivity(agent.id, undefined, undefined);
      }, 3000);

      if (msg.title) {
        updateDoc(msg.docId, { title: msg.title });
      } else {
        updateDoc(msg.docId, {});
      }
      ws.send(JSON.stringify({ type: 'doc_edited', docId: msg.docId, action }));
      notifyClients('doc:updated', {
        docId: msg.docId,
        title: msg.title || existing.title,
      }, wsId);
      notifyClients('doc:activity', {
        agentName: agent.name,
        action: `edited (${action})`,
        docTitle: msg.title || existing.title,
      }, wsId);
      break;
    }

    case 'search_docs': {
      const allDocs = getAllDocs();
      const q = (msg.query || '').toLowerCase();
      const results: Array<{ docId: string; title: string; snippet: string; score: number }> = [];
      for (const d of allDocs) {
        let score = 0;
        const titleLower = d.title.toLowerCase();
        const content = getYDocText(d.id);
        const contentLower = content.toLowerCase();
        if (titleLower.includes(q)) score += 10;
        if (contentLower.includes(q)) score += 5;
        if (score === 0) continue;
        const idx = contentLower.indexOf(q);
        let snippet = '';
        if (idx >= 0) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(content.length, idx + q.length + 40);
          snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
        } else {
          snippet = content.slice(0, 80) + (content.length > 80 ? '...' : '');
        }
        results.push({ docId: d.id, title: d.title, snippet, score });
      }
      results.sort((a, b) => b.score - a.score);
      ws.send(JSON.stringify({ type: 'search_results', results }));
      break;
    }

    default:
      ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
  }
}

export function createAgentGateway(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    let agent: ConnectedAgent | null = null;

    // Agents must auth within 10 seconds
    const authTimeout = setTimeout(() => {
      if (!agent) {
        ws.send(JSON.stringify({ type: 'error', message: 'Auth timeout' }));
        ws.close();
      }
    }, 10000);

    ws.on('message', (raw) => {
      const msg = parseMessage(raw as Buffer);
      if (!msg) {
        ws.send(JSON.stringify({ type: 'error', message: 'Could not parse message. Send JSON or text commands.' }));
        return;
      }

      // --- AUTH ---
      if (msg.type === 'auth') {
        const authWorkspaceId = msg.workspaceId || undefined;
        // Support two modes:
        // 1. Pre-registered: { type: "auth", token: "agt_token_...", workspaceId?: "..." }
        // 2. Self-register:  { type: "auth", name: "MyBot", capabilities: [...], workspaceId?: "..." }
        if (msg.token) {
          const found = getAgentByToken(msg.token);
          if (!found) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close();
            return;
          }
          clearTimeout(authTimeout);
          agent = found;
          if (authWorkspaceId) setAgentWorkspace(agent.id, authWorkspaceId);
          setAgentWs(agent.id, ws);
          ws.send(JSON.stringify({ type: 'auth_ok', agent: { id: agent.id, name: agent.name, workspaceId: agent.workspaceId } }));
          notifyClients('agent:status', serializeAgent(agent), agent.workspaceId);
          console.log(`[agent-gateway] Agent "${agent.name}" (${agent.id}) connected via token${agent.workspaceId ? ` in workspace ${agent.workspaceId}` : ''}`);
        } else if (msg.name) {
          // Self-registration: connect and go, no pre-registration needed
          // Check if agent with same name already exists (reconnect case)
          let existing = getAgentByName(msg.name, authWorkspaceId);
          if (existing) {
            clearTimeout(authTimeout);
            agent = existing;
            if (authWorkspaceId) setAgentWorkspace(agent.id, authWorkspaceId);
            setAgentWs(agent.id, ws);
            if (msg.capabilities) {
              updateAgentCapabilities(agent.id, msg.capabilities);
            }
            ws.send(JSON.stringify({
              type: 'auth_ok',
              agent: { id: agent.id, name: agent.name, token: agent.token, workspaceId: agent.workspaceId },
            }));
            notifyClients('agent:status', serializeAgent(agent), agent.workspaceId);
            console.log(`[agent-gateway] Agent "${agent.name}" (${agent.id}) reconnected via name${agent.workspaceId ? ` in workspace ${agent.workspaceId}` : ''}`);
          } else {
            // New self-registration
            const { id, token } = registerAgent(msg.name, msg.capabilities || [], authWorkspaceId);
            const registered = getAgentByToken(token);
            if (!registered) {
              ws.send(JSON.stringify({ type: 'error', message: 'Registration failed' }));
              ws.close();
              return;
            }
            clearTimeout(authTimeout);
            agent = registered;
            setAgentWs(agent.id, ws);
            ws.send(JSON.stringify({
              type: 'auth_ok',
              agent: { id: agent.id, name: agent.name, token: agent.token, workspaceId: agent.workspaceId },
            }));
            notifyClients('agent:status', serializeAgent(agent), agent.workspaceId);
            console.log(`[agent-gateway] Agent "${agent.name}" (${agent.id}) self-registered${agent.workspaceId ? ` in workspace ${agent.workspaceId}` : ''}`);
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Auth requires token or name' }));
          ws.close();
          return;
        }
        return;
      }

      if (!agent) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }

      handleAgentMessage(ws, agent, msg);
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (agent) {
        console.log(`[agent-gateway] Agent "${agent.name}" (${agent.id}) WebSocket closed`);
        handleAgentDisconnect(agent.id);
      }
    });

    ws.on('error', (err) => {
      console.error('[agent-gateway] WebSocket error:', err.message);
    });
  });

  return wss;
}

// Export handleAgentMessage for use by HTTP polling endpoint
export { handleAgentMessage };
