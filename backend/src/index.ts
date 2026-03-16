import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { createAgentGateway, setSocketIOBroadcast } from './agent-gateway.js';
import { setCommentBroadcast } from './comment-bridge.js';
import { setupSocketHandlers } from './socket-handler.js';
import agentRoutes from './routes/agents.js';
import agentCodeRoutes from './routes/agent-codes.js';
import workspaceRoutes from './routes/workspaces.js';
import { startDemoAgent } from './demo-agent.js';
import { ensureDataDir } from './persistence.js';
import { getYDoc } from './yjs-server.js';
import { getYjsDocClients } from './yjs-broadcast.js';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// Ensure data directory exists
ensureDataDir();

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',');

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json());

// REST routes
app.use('/api/agents', agentRoutes);
app.use('/api/agent-codes', agentCodeRoutes);
app.use('/api/workspaces', workspaceRoutes);

// Invite via Clerk
app.post('/api/invite', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) return res.status(500).json({ error: 'Clerk not configured' });
    const resp = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        redirect_url: process.env.FRONTEND_URL || 'https://dist-beige-two-17.vercel.app',
        notify: true,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.errors?.[0]?.message || 'Failed to send invite' });
    res.json({ success: true, id: data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Socket.io for browser clients
const io = new SocketIOServer(server, {
  cors: { origin: CORS_ORIGINS, credentials: true },
});

setupSocketHandlers(io);

// Wire up agent gateway → socket.io broadcast (workspace-scoped)
const broadcast = (event: string, data: any, workspaceId?: string) => {
  if (workspaceId) {
    io.to(`workspace:${workspaceId}`).emit(event, data);
  } else {
    io.emit(event, data);
  }
};
setSocketIOBroadcast(broadcast);
setCommentBroadcast(broadcast);

// Agent WebSocket gateway (separate path)
const agentWss = createAgentGateway(server);

// Yjs WebSocket server (separate WSS for /yjs/:docId)
const yjsWss = new WebSocketServer({ noServer: true });

// Yjs sync protocol message types
const messageSync = 0;
const messageAwareness = 1;

function sendYjsSync(ws: WebSocket, ydoc: Y.Doc) {
  // Send sync step 1: full state vector
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  encoding.writeVarUint(encoder, 0); // sync step 1
  const sv = Y.encodeStateVector(ydoc);
  encoding.writeVarUint8Array(encoder, sv);
  ws.send(encoding.toUint8Array(encoder));

  // Send sync step 2: full update
  const encoder2 = encoding.createEncoder();
  encoding.writeVarUint(encoder2, messageSync);
  encoding.writeVarUint(encoder2, 1); // sync step 2 (messageYjsSyncStep2)
  const update = Y.encodeStateAsUpdate(ydoc);
  encoding.writeVarUint8Array(encoder2, update);
  ws.send(encoding.toUint8Array(encoder2));
}

yjsWss.on('connection', (ws: WebSocket, docId: string) => {
  const ydoc = getYDoc(docId);
  const clients = yjsDocClients.get(docId) || new Set();
  clients.add(ws);
  yjsDocClients.set(docId, clients);

  console.log(`[yjs] Client connected to doc "${docId}" (${clients.size} clients)`);

  // Send initial sync
  sendYjsSync(ws, ydoc);

  ws.on('message', (data: Buffer) => {
    try {
      const uint8 = new Uint8Array(data);
      const decoder = decoding.createDecoder(uint8);
      const msgType = decoding.readVarUint(decoder);

      if (msgType === messageSync) {
        const syncType = decoding.readVarUint(decoder);
        if (syncType === 0) {
          // Sync step 1: client sends state vector, we reply with update
          const sv = decoding.readVarUint8Array(decoder);
          const update = Y.encodeStateAsUpdate(ydoc, sv);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          encoding.writeVarUint(encoder, 1); // sync step 2 (messageYjsSyncStep2)
          encoding.writeVarUint8Array(encoder, update);
          ws.send(encoding.toUint8Array(encoder));
        } else if (syncType === 1 || syncType === 2) {
          // Sync step 2 or update: apply to doc and broadcast
          const update = decoding.readVarUint8Array(decoder);
          Y.applyUpdate(ydoc, update, 'websocket');
          // Broadcast to all other clients of this doc
          for (const client of clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              const encoder = encoding.createEncoder();
              encoding.writeVarUint(encoder, messageSync);
              encoding.writeVarUint(encoder, 2);
              encoding.writeVarUint8Array(encoder, update);
              client.send(encoding.toUint8Array(encoder));
            }
          }
        }
      } else if (msgType === messageAwareness) {
        // Broadcast awareness to all other clients
        for (const client of clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        }
      }
    } catch (err) {
      console.error('[yjs] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (clients.size === 0) {
      yjsDocClients.delete(docId);
    }
    console.log(`[yjs] Client disconnected from doc "${docId}" (${clients.size} clients)`);
  });
});

// Use shared client registry from yjs-broadcast so server-side mutations broadcast correctly
const yjsDocClients = getYjsDocClients();

// Handle HTTP upgrade for /agent and /yjs paths
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

  if (pathname === '/agent') {
    agentWss.handleUpgrade(request, socket, head, (ws) => {
      agentWss.emit('connection', ws, request);
    });
  } else if (pathname.startsWith('/yjs/')) {
    const docId = pathname.slice(5); // Remove '/yjs/'
    if (!docId) {
      socket.destroy();
      return;
    }
    yjsWss.handleUpgrade(request, socket, head, (ws) => {
      yjsWss.emit('connection', ws, docId);
    });
  } else {
    // Let socket.io handle its own upgrades
  }
});

server.listen(PORT, () => {
  console.log(`[grid-backend] Server running on http://localhost:${PORT}`);
  console.log(`[grid-backend] Agent WebSocket: ws://localhost:${PORT}/agent`);
  console.log(`[grid-backend] Yjs WebSocket: ws://localhost:${PORT}/yjs/:docId`);
  console.log(`[grid-backend] Socket.io: http://localhost:${PORT}`);

  // Start demo agent
  startDemoAgent();
});
