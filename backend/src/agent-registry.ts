import { randomUUID } from 'crypto';
import type { WebSocket } from 'ws';

export interface ConnectedAgent {
  id: string;
  name: string;
  token: string;
  status: 'ONLINE' | 'BUSY' | 'SLEEPING' | 'OFFLINE' | 'RECONNECTING';
  capabilities: string[];
  ws: WebSocket | null;
  connectedAt: Date;
  lastActivity: Date;
  currentDocId?: string;
  currentAction?: string;
  disconnectedAt?: Date;
  workspaceId?: string;
  addedBy?: string;
}

export interface PermissionRequest {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  docId?: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
}

// Registered agents (persistent across connections)
const agents = new Map<string, ConnectedAgent>();
// Token → agent id lookup
const tokenIndex = new Map<string, string>();
// Message queue for offline agents
const messageQueue = new Map<string, object[]>();
// Pending permission requests
const permissionRequests = new Map<string, PermissionRequest>();
// Reconnect timers — remove agent after 5 minutes of disconnect
const reconnectTimers = new Map<string, NodeJS.Timeout>();
// Heartbeat intervals
const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

const RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const HEARTBEAT_TIMEOUT_MS = 10 * 1000;

export function registerAgent(name: string, capabilities: string[] = [], workspaceId?: string, addedBy?: string): { id: string; token: string } {
  const id = `agt_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const token = `agt_token_${randomUUID().replace(/-/g, '')}`;

  const agent: ConnectedAgent = {
    id,
    name,
    token,
    status: 'OFFLINE',
    capabilities,
    ws: null,
    connectedAt: new Date(),
    lastActivity: new Date(),
    workspaceId: workspaceId || undefined,
    addedBy: addedBy || undefined,
  };

  agents.set(id, agent);
  tokenIndex.set(token, id);
  return { id, token };
}

export function getAgentsForWorkspace(workspaceId: string): ConnectedAgent[] {
  return Array.from(agents.values()).filter(
    (a) => a.workspaceId === workspaceId
  );
}

export function setAgentWorkspace(id: string, workspaceId: string): void {
  const agent = agents.get(id);
  if (agent) {
    agent.workspaceId = workspaceId;
  }
}

export function getAgentByToken(token: string): ConnectedAgent | undefined {
  const id = tokenIndex.get(token);
  return id ? agents.get(id) : undefined;
}

export function getAgentByName(name: string, workspaceId?: string): ConnectedAgent | undefined {
  for (const agent of agents.values()) {
    if (agent.name.toLowerCase() === name.toLowerCase()) {
      if (workspaceId && agent.workspaceId && agent.workspaceId !== workspaceId) continue;
      return agent;
    }
  }
  return undefined;
}

export function getAgent(id: string): ConnectedAgent | undefined {
  return agents.get(id);
}

export function getAllAgents(): ConnectedAgent[] {
  return Array.from(agents.values());
}

export function removeAgent(id: string): void {
  const agent = agents.get(id);
  if (agent) {
    tokenIndex.delete(agent.token);
    if (agent.ws) {
      try { agent.ws.close(); } catch {}
    }
    clearReconnectTimer(id);
    clearHeartbeat(id);
    agents.delete(id);
    messageQueue.delete(id);
  }
}

function clearReconnectTimer(id: string) {
  const timer = reconnectTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(id);
  }
}

function clearHeartbeat(id: string) {
  const interval = heartbeatIntervals.get(id);
  if (interval) {
    clearInterval(interval);
    heartbeatIntervals.delete(id);
  }
}

function startHeartbeat(id: string, ws: WebSocket) {
  clearHeartbeat(id);
  let pongReceived = true;

  const interval = setInterval(() => {
    const agent = agents.get(id);
    if (!agent || agent.ws !== ws) {
      clearInterval(interval);
      heartbeatIntervals.delete(id);
      return;
    }
    if (!pongReceived) {
      // No pong within interval — mark disconnected
      console.log(`[agent-registry] No heartbeat pong from "${agent.name}", marking disconnected`);
      handleAgentDisconnect(id);
      return;
    }
    pongReceived = false;
    try {
      ws.ping();
    } catch {
      handleAgentDisconnect(id);
    }
  }, HEARTBEAT_INTERVAL_MS);

  heartbeatIntervals.set(id, interval);

  ws.on('pong', () => {
    pongReceived = true;
  });
}

// Callback for notifying frontend — set by agent-gateway
let onStatusChange: ((agent: ConnectedAgent) => void) | null = null;
export function setOnStatusChange(fn: (agent: ConnectedAgent) => void) {
  onStatusChange = fn;
}

export function handleAgentDisconnect(id: string): void {
  const agent = agents.get(id);
  if (!agent) return;

  clearHeartbeat(id);

  if (agent.ws) {
    try { agent.ws.close(); } catch {}
  }
  agent.ws = null;
  agent.status = 'RECONNECTING';
  agent.disconnectedAt = new Date();
  if (onStatusChange) onStatusChange(agent);

  console.log(`[agent-registry] Agent "${agent.name}" disconnected, waiting ${RECONNECT_WINDOW_MS / 1000}s for reconnect`);

  // Start reconnect timer — after 5 minutes, mark fully offline
  clearReconnectTimer(id);
  const timer = setTimeout(() => {
    const a = agents.get(id);
    if (a && a.status === 'RECONNECTING') {
      a.status = 'OFFLINE';
      console.log(`[agent-registry] Agent "${a.name}" reconnect window expired, now OFFLINE`);
      if (onStatusChange) onStatusChange(a);
    }
    reconnectTimers.delete(id);
  }, RECONNECT_WINDOW_MS);
  reconnectTimers.set(id, timer);
}

export function setAgentWs(id: string, ws: WebSocket | null): void {
  const agent = agents.get(id);
  if (agent) {
    agent.ws = ws;
    agent.lastActivity = new Date();

    if (ws) {
      // Reconnecting — clear timer and restore
      clearReconnectTimer(id);
      agent.status = 'ONLINE';
      delete agent.disconnectedAt;

      // Start heartbeat
      startHeartbeat(id, ws);

      // Drain queued messages on reconnect
      if (messageQueue.has(id)) {
        const queue = messageQueue.get(id)!;
        if (queue.length > 0) {
          console.log(`[agent-registry] Delivering ${queue.length} queued messages to "${agent.name}"`);
          for (const msg of queue) {
            try { ws.send(JSON.stringify(msg)); } catch {}
          }
          messageQueue.delete(id);
        }
      }
    }
    // If ws is null, handleAgentDisconnect should be called instead
  }
}

export function updateAgentStatus(id: string, status: ConnectedAgent['status']): void {
  const agent = agents.get(id);
  if (agent) {
    agent.status = status;
    agent.lastActivity = new Date();
  }
}

export function updateAgentCapabilities(id: string, capabilities: string[]): void {
  const agent = agents.get(id);
  if (agent) {
    agent.capabilities = capabilities;
    agent.lastActivity = new Date();
  }
}

export function updateAgentActivity(id: string, docId?: string, action?: string): void {
  const agent = agents.get(id);
  if (agent) {
    agent.currentDocId = docId;
    agent.currentAction = action;
    agent.lastActivity = new Date();
  }
}

export function broadcastToAgents(message: object): void {
  const data = JSON.stringify(message);
  for (const agent of agents.values()) {
    if (agent.ws && agent.status !== 'OFFLINE') {
      try { agent.ws.send(data); } catch {}
    }
  }
}

export function sendToAgent(id: string, message: object): boolean {
  const agent = agents.get(id);
  if (agent?.ws && agent.status !== 'OFFLINE' && agent.status !== 'RECONNECTING') {
    try {
      agent.ws.send(JSON.stringify(message));
      return true;
    } catch {}
  }
  // Agent is offline or reconnecting — queue the message
  if (agent) {
    const queue = messageQueue.get(id) || [];
    queue.push(message);
    // Cap at 100 queued messages per agent
    if (queue.length > 100) queue.shift();
    messageQueue.set(id, queue);
    console.log(`[agent-registry] Queued message for agent "${agent.name}" (${queue.length} pending)`);
    return false;
  }
  return false;
}

// Permission request management
export function createPermissionRequest(agentId: string, agentName: string, action: string, docId?: string, description?: string): PermissionRequest {
  const req: PermissionRequest = {
    id: `perm_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    agentId,
    agentName,
    action,
    docId,
    description: description || action,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  permissionRequests.set(req.id, req);
  return req;
}

export function resolvePermissionRequest(id: string, approved: boolean): PermissionRequest | undefined {
  const req = permissionRequests.get(id);
  if (req) {
    req.status = approved ? 'approved' : 'denied';
    // Send result back to agent
    sendToAgent(req.agentId, {
      type: 'permission_result',
      requestId: req.id,
      action: req.action,
      approved,
    });
    // Clean up after a delay
    setTimeout(() => permissionRequests.delete(id), 60000);
  }
  return req;
}

export function getPendingPermissions(): PermissionRequest[] {
  return Array.from(permissionRequests.values()).filter(r => r.status === 'pending');
}

export function serializeAgent(agent: ConnectedAgent) {
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status,
    capabilities: agent.capabilities,
    connectedAt: agent.connectedAt.toISOString(),
    lastActivity: agent.lastActivity.toISOString(),
    currentDocId: agent.currentDocId,
    currentAction: agent.currentAction,
    disconnectedAt: agent.disconnectedAt?.toISOString(),
    workspaceId: agent.workspaceId,
    addedBy: agent.addedBy,
  };
}
