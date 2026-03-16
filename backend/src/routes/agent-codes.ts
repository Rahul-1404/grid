import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'crypto';
import { registerAgent } from '../agent-registry.js';

const router = Router();

// ──────────────────────────────────────────────
// Agent Join Codes — short codes for one-command connect
// ──────────────────────────────────────────────

interface AgentCode {
  code: string;
  workspaceId?: string;
  token: string;
  agentId: string;
  agentName: string;
  capabilities: string[];
  wsUrl: string;
  createdBy?: string;
  expiresAt: Date;
}

const agentCodes = new Map<string, AgentCode>();

function generateShortCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function cleanExpiredCodes() {
  const now = new Date();
  for (const [code, entry] of agentCodes) {
    if (entry.expiresAt < now) agentCodes.delete(code);
  }
}

// POST /api/agent-codes — Create a join code
// Body: { workspaceId?, agentName, capabilities? }
// Returns: { code, expiresAt, joinCommand }
router.post('/', (req: Request, res: Response) => {
  cleanExpiredCodes();

  const { workspaceId, agentName, capabilities = [] } = req.body;
  if (!agentName || typeof agentName !== 'string') {
    res.status(400).json({ error: 'agentName is required' });
    return;
  }

  // Register the agent to get a token
  const { id, token } = registerAgent(agentName, capabilities, workspaceId);

  const host = req.get('host') || 'localhost:3001';
  const protocol = req.protocol === 'https' ? 'wss' : 'ws';
  const wsUrl = `${protocol}://${host}/agent`;

  const code = generateShortCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  agentCodes.set(code, {
    code,
    workspaceId,
    token,
    agentId: id,
    agentName,
    capabilities,
    wsUrl,
    createdBy: req.body.createdBy,
    expiresAt,
  });

  const presetKey = agentName.toLowerCase().replace(/\s+/g, '-');
  const joinCommand = `grid-agent bridge ${presetKey} --join ${code}`;

  res.status(201).json({
    code,
    agentId: id,
    token,
    wsUrl,
    expiresAt: expiresAt.toISOString(),
    joinCommand,
  });
});

// GET /api/agent-codes/:code — Resolve a join code
router.get('/:code', (req: Request, res: Response) => {
  cleanExpiredCodes();

  const entry = agentCodes.get(req.params.code);
  if (!entry) {
    res.status(404).json({ error: 'Invalid or expired join code' });
    return;
  }

  res.json({
    token: entry.token,
    url: entry.wsUrl,
    workspaceId: entry.workspaceId,
    agentName: entry.agentName,
    agentId: entry.agentId,
    capabilities: entry.capabilities,
  });
});

export default router;
