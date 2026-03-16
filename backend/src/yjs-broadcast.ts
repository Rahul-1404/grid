import { WebSocket } from 'ws';

// Shared registry of Yjs WebSocket clients per doc
const yjsDocClients = new Map<string, Set<WebSocket>>();

export function getYjsDocClients(): Map<string, Set<WebSocket>> {
  return yjsDocClients;
}

export function broadcastToYjsClients(docId: string, data: Uint8Array, exclude?: WebSocket): void {
  const clients = yjsDocClients.get(docId);
  if (!clients) return;
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
