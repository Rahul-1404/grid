import type { Server as SocketIOServer } from 'socket.io';
import { registerAgent, removeAgent, sendToAgent, getAllAgents, getAgentsForWorkspace, serializeAgent, resolvePermissionRequest, getPendingPermissions } from './agent-registry.js';
import { routeCommentToAgents } from './comment-bridge.js';

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`);
    let currentWorkspaceId: string | null = null;

    // Client joins a workspace room
    socket.on('workspace:join', (data: { workspaceId: string }) => {
      if (currentWorkspaceId) {
        socket.leave(`workspace:${currentWorkspaceId}`);
      }
      currentWorkspaceId = data.workspaceId;
      socket.join(`workspace:${currentWorkspaceId}`);
      // Send agents for this workspace
      const agents = getAgentsForWorkspace(currentWorkspaceId);
      socket.emit('agent:list', agents.map(serializeAgent));
      console.log(`[socket.io] Client ${socket.id} joined workspace ${currentWorkspaceId}`);
    });

    socket.on('workspace:leave', (data: { workspaceId: string }) => {
      socket.leave(`workspace:${data.workspaceId}`);
      if (currentWorkspaceId === data.workspaceId) {
        currentWorkspaceId = null;
      }
    });

    // Send current agent list on connect (all agents for backward compat)
    socket.emit('agent:list', getAllAgents().map(serializeAgent));

    // Send pending permission requests
    const pending = getPendingPermissions();
    if (pending.length > 0) {
      for (const req of pending) {
        socket.emit('permission:request', req);
      }
    }

    // User wants to register/connect an agent
    socket.on('agent:connect', async (data: { name: string; endpoint?: string; capabilities?: string[]; workspaceId?: string; addedBy?: string }) => {
      const { id, token } = registerAgent(data.name, data.capabilities || [], data.workspaceId, data.addedBy);
      const host = socket.handshake.headers.host || 'localhost:3001';
      const protocol = socket.handshake.secure ? 'wss' : 'ws';
      socket.emit('agent:registered', { id, token, wsUrl: `${protocol}://${host}/agent`, workspaceId: data.workspaceId });
      // Broadcast to workspace room if scoped, otherwise to all
      if (data.workspaceId) {
        const agents = getAgentsForWorkspace(data.workspaceId);
        io.to(`workspace:${data.workspaceId}`).emit('agent:list', agents.map(serializeAgent));
      } else {
        io.emit('agent:list', getAllAgents().map(serializeAgent));
      }
    });

    socket.on('agent:disconnect', (data: { id: string }) => {
      removeAgent(data.id);
      // Broadcast updated list to all workspace rooms
      if (currentWorkspaceId) {
        const agents = getAgentsForWorkspace(currentWorkspaceId);
        io.to(`workspace:${currentWorkspaceId}`).emit('agent:list', agents.map(serializeAgent));
      }
      io.emit('agent:list', getAllAgents().map(serializeAgent));
    });

    // User sends message to agent via socket
    socket.on('agent:message', (data: { agentId: string; text: string; context?: any }) => {
      sendToAgent(data.agentId, {
        type: 'dm',
        from: { id: socket.id, name: 'User' },
        text: data.text,
        context: data.context,
      });
    });

    // Comment created - check for @mentions
    socket.on('comment:create', (comment: {
      id: string;
      documentId: string;
      text: string;
      quotedText: string;
      author: { id: string; name: string };
    }) => {
      routeCommentToAgents(comment);
      socket.broadcast.emit('comment:created', comment);
    });

    socket.on('comment:reply', (data: {
      commentId: string;
      documentId: string;
      text: string;
      author: { id: string; name: string };
    }) => {
      routeCommentToAgents({
        id: data.commentId,
        documentId: data.documentId,
        text: data.text,
        quotedText: '',
        author: data.author,
      });
      socket.broadcast.emit('comment:reply', data);
    });

    // Approval response from user (legacy)
    socket.on('approval:respond', (data: { agentId: string; approved: boolean; by: { id: string; name: string } }) => {
      sendToAgent(data.agentId, {
        type: 'approval_result',
        approved: data.approved,
        by: data.by,
      });
    });

    // Permission response from user
    socket.on('permission:respond', (data: { requestId: string; approved: boolean }) => {
      const result = resolvePermissionRequest(data.requestId, data.approved);
      if (result) {
        // Broadcast resolution to all clients
        io.emit('permission:resolved', result);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[socket.io] Client disconnected: ${socket.id}`);
    });
  });
}
