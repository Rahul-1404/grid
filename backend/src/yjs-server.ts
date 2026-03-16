import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import { loadYjsState, saveYjsState } from './persistence.js';
import { seedYDoc, yDocToText, yDocToMarkdown, insertTextToYDoc } from './yjs-utils.js';
import { getDoc } from './doc-store.js';
import { broadcastToYjsClients } from './yjs-broadcast.js';

// In-memory cache of Yjs documents
const docs = new Map<string, Y.Doc>();

/**
 * Get or create a Yjs document by ID.
 * If the doc doesn't exist in memory, load from disk or seed from doc-store content.
 */
export function getYDoc(docId: string): Y.Doc {
  let ydoc = docs.get(docId);
  if (ydoc) return ydoc;

  ydoc = new Y.Doc();

  // Try loading persisted state
  const savedState = loadYjsState(docId);
  if (savedState) {
    Y.applyUpdate(ydoc, savedState);
  } else {
    // Seed from doc-store if the doc has initial content
    const storedDoc = getDoc(docId);
    if (storedDoc && storedDoc.content) {
      seedYDoc(ydoc, storedDoc.content);
    }
  }

  // Auto-save on updates and broadcast to connected clients
  ydoc.on('update', (update: Uint8Array, origin: unknown) => {
    const state = Y.encodeStateAsUpdate(ydoc!);
    saveYjsState(docId, state);
    // Broadcast update to all WebSocket clients (for server-side mutations like agent edits)
    // Skip if origin is a WebSocket client (those are already handled in index.ts)
    if (origin !== 'websocket') {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // messageSync
      encoding.writeVarUint(encoder, 2); // sync step 2 (update)
      encoding.writeVarUint8Array(encoder, update);
      broadcastToYjsClients(docId, encoding.toUint8Array(encoder));
    }
  });

  docs.set(docId, ydoc);
  return ydoc;
}

/**
 * Apply edits to a Yjs doc. The callback receives the doc for mutation.
 */
export function applyYjsUpdate(docId: string, callback: (ydoc: Y.Doc) => void): void {
  const ydoc = getYDoc(docId);
  callback(ydoc);
}

/**
 * Create a new Yjs doc with initial content.
 */
export function createYjsDoc(docId: string, initialContent: string): Y.Doc {
  const ydoc = new Y.Doc();
  seedYDoc(ydoc, initialContent);

  // Auto-save
  ydoc.on('update', () => {
    const state = Y.encodeStateAsUpdate(ydoc);
    saveYjsState(docId, state);
  });

  // Save initial state
  const state = Y.encodeStateAsUpdate(ydoc);
  saveYjsState(docId, state);

  docs.set(docId, ydoc);
  return ydoc;
}

/**
 * Get text content from a Yjs doc.
 */
export function getYDocText(docId: string): string {
  const ydoc = getYDoc(docId);
  return yDocToText(ydoc);
}

/**
 * Get markdown content from a Yjs doc.
 */
export function getYDocMarkdown(docId: string): string {
  const ydoc = getYDoc(docId);
  return yDocToMarkdown(ydoc);
}

// Re-export utility for direct use
export { insertTextToYDoc } from './yjs-utils.js';
