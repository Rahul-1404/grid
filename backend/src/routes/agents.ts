import { Router, type Request, type Response } from 'express';
import {
  registerAgent,
  getAgent,
  getAllAgents,
  getAgentsForWorkspace,
  removeAgent,
  sendToAgent,
  serializeAgent,
  resolvePermissionRequest,
  getPendingPermissions,
} from '../agent-registry.js';

const router = Router();

// POST /api/agents — Register a new agent
router.post('/', (req: Request, res: Response) => {
  const { name, capabilities, workspaceId, addedBy } = req.body;
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const { id, token } = registerAgent(name, capabilities || [], workspaceId, addedBy);
  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol === 'https' ? 'wss' : 'ws';
  res.status(201).json({
    id,
    token,
    workspaceId: workspaceId || undefined,
    wsUrl: `${protocol}://${host}/agent`,
    pollUrl: `/api/agents/${id}/poll`,
    sseUrl: `/api/agents/${id}/events`,
  });
});

// GET /api/agents — List all agents (optionally filtered by workspace)
router.get('/', (req: Request, res: Response) => {
  const workspaceId = req.query.workspaceId as string | undefined;
  if (workspaceId) {
    res.json(getAgentsForWorkspace(workspaceId).map(serializeAgent));
  } else {
    res.json(getAllAgents().map(serializeAgent));
  }
});

// DELETE /api/agents/:id — Remove an agent
router.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const agent = getAgent(id);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  removeAgent(id);
  res.json({ ok: true });
});

// POST /api/agents/:id/message — Send message to agent (HTTP fallback)
router.post('/:id/message', (req: Request, res: Response) => {
  const agent = getAgent(req.params.id as string);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  const { text, context } = req.body;
  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }
  const sent = sendToAgent(agent.id, {
    type: 'dm',
    from: { id: 'api', name: 'API' },
    text,
    context,
  });
  if (!sent) {
    res.status(503).json({ error: 'Agent is not connected', queued: true });
    return;
  }
  res.json({ sent: true, message: 'Message delivered to agent' });
});

// ──────────────────────────────────────────────
// HTTP Polling fallback (for agents that can't do WebSocket)
// ──────────────────────────────────────────────

// Message buffers for polling agents (agentId -> messages[])
const pollBuffers = new Map<string, object[]>();

export function queueForPoll(agentId: string, message: object) {
  const buf = pollBuffers.get(agentId) || [];
  buf.push(message);
  if (buf.length > 200) buf.shift();
  pollBuffers.set(agentId, buf);
}

// POST /api/agents/:id/poll — Agent sends a message and receives queued messages
// Body: { token: string, messages?: object[] }
// Response: { messages: object[] }
router.post('/:id/poll', (req: Request, res: Response) => {
  const agent = getAgent(req.params.id as string);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  // Verify token
  const { token, messages } = req.body;
  if (token !== agent.token) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Process incoming messages from agent (if any)
  // For polling agents, we just accept and process them
  if (Array.isArray(messages)) {
    for (const msg of messages) {
      // These would need to be processed similar to WS messages
      // For simplicity, handle 'send' type
      if ((msg as any).type === 'send') {
        // Emit via socketIO
      }
    }
  }

  // Update last activity
  agent.lastActivity = new Date();
  if (agent.status === 'OFFLINE' || agent.status === 'RECONNECTING') {
    agent.status = 'ONLINE';
  }

  // Return queued messages and clear buffer
  const buf = pollBuffers.get(agent.id) || [];
  pollBuffers.delete(agent.id);
  res.json({ messages: buf });
});

// ──────────────────────────────────────────────
// SSE (Server-Sent Events) for agents that prefer event streams
// ──────────────────────────────────────────────

const sseClients = new Map<string, Set<Response>>();

export function sendSSE(agentId: string, event: string, data: object) {
  const clients = sseClients.get(agentId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch {}
  }
}

// GET /api/agents/:id/events — SSE stream for agent
router.get('/:id/events', (req: Request, res: Response) => {
  const agent = getAgent(req.params.id as string);
  if (!agent) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }

  // Verify token via query param
  const token = req.query.token as string;
  if (token !== agent.token) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ agentId: agent.id, name: agent.name })}\n\n`);

  // Register this SSE client
  if (!sseClients.has(agent.id)) {
    sseClients.set(agent.id, new Set());
  }
  sseClients.get(agent.id)!.add(res);

  // Update agent status
  agent.lastActivity = new Date();
  if (agent.status === 'OFFLINE') agent.status = 'ONLINE';

  // Keepalive
  const keepalive = setInterval(() => {
    try { res.write(`:keepalive\n\n`); } catch {}
  }, 15000);

  req.on('close', () => {
    clearInterval(keepalive);
    const clients = sseClients.get(agent.id);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(agent.id);
    }
  });
});

// ──────────────────────────────────────────────
// Permission management endpoints
// ──────────────────────────────────────────────

// GET /api/agents/permissions/pending — List pending permission requests
router.get('/permissions/pending', (_req: Request, res: Response) => {
  res.json(getPendingPermissions());
});

// POST /api/agents/permissions/:id/resolve — Approve or deny a permission request
router.post('/permissions/:id/resolve', (req: Request, res: Response) => {
  const { approved } = req.body;
  if (typeof approved !== 'boolean') {
    res.status(400).json({ error: 'approved (boolean) is required' });
    return;
  }
  const result = resolvePermissionRequest(req.params.id as string, approved);
  if (!result) {
    res.status(404).json({ error: 'Permission request not found' });
    return;
  }
  res.json(result);
});

export default router;
