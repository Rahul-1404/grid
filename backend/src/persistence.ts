import fs from 'fs';
import path from 'path';

const DATA_DIR = './data/yjs';

export function loadYjsState(docId: string): Uint8Array | null {
  const filePath = path.join(DATA_DIR, `${docId}.bin`);
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export function saveYjsState(docId: string, state: Uint8Array): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, `${docId}.bin`), state);
}

export function ensureDataDir(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
