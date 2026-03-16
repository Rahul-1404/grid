import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface GridAgentOptions {
  name: string;
  url?: string;
  token?: string;
  capabilities?: string[];
  workspaceId?: string;
  maxRetries?: number;
}

export interface MentionData {
  commentId: string;
  text: string;
  author: string;
  docId: string;
  workspaceId: string;
}

export interface MessageData {
  type: string;
  [key: string]: any;
}

const DEFAULT_URL = 'wss://grid-backend-production.up.railway.app/agent';
const MAX_RETRIES = 5;

export class GridAgent extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: Required<Pick<GridAgentOptions, 'name' | 'url' | 'capabilities' | 'maxRetries'>> & { token?: string; workspaceId?: string };
  private retryCount = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private _token: string | undefined;
  private _agentId: string | undefined;

  constructor(opts: GridAgentOptions) {
    super();
    this.options = {
      name: opts.name,
      url: opts.url || DEFAULT_URL,
      token: opts.token,
      capabilities: opts.capabilities || [],
      workspaceId: opts.workspaceId,
      maxRetries: opts.maxRetries ?? MAX_RETRIES,
    };
    this._token = opts.token;
  }

  get token(): string | undefined {
    return this._token;
  }

  get agentId(): string | undefined {
    return this._agentId;
  }

  connect(): void {
    this.intentionalClose = false;
    this.retryCount = 0;
    this._connect();
  }

  private _connect(): void {
    try {
      this.ws = new WebSocket(this.options.url);
    } catch (err) {
      this.emit('error', err);
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      this.retryCount = 0;
      this._startHeartbeat();

      // Send auth
      const authMsg: any = { type: 'auth' };
      if (this._token) {
        authMsg.token = this._token;
      } else {
        authMsg.name = this.options.name;
        authMsg.capabilities = this.options.capabilities;
      }
      if (this.options.workspaceId) {
        authMsg.workspaceId = this.options.workspaceId;
      }
      this.ws!.send(JSON.stringify(authMsg));
    });

    this.ws.on('message', (raw: WebSocket.Data) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case 'auth_ok':
          this._token = msg.token || this._token;
          this._agentId = msg.agentId || msg.id;
          this.emit('connected', { token: this._token, agentId: this._agentId });
          break;
        case 'auth_error':
          this.emit('error', new Error(msg.message || 'Authentication failed'));
          break;
        case 'mention':
          this.emit('mention', msg as MentionData);
          break;
        case 'pong':
          // heartbeat response
          break;
        default:
          this.emit('message', msg as MessageData);
      }
    });

    this.ws.on('close', (code: number) => {
      this._stopHeartbeat();
      this.emit('disconnected', { code });
      if (!this.intentionalClose) {
        this._scheduleReconnect();
      }
    });

    this.ws.on('error', (err: Error) => {
      this.emit('error', err);
    });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  reply(commentId: string, text: string): void {
    this._send({ type: 'reply', commentId, text });
  }

  editDoc(docId: string, content: string): void {
    this._send({ type: 'edit_doc', docId, content });
  }

  createDoc(title: string, content: string): void {
    this._send({ type: 'create_doc', title, content });
  }

  listDocs(): void {
    this._send({ type: 'list_docs' });
  }

  readDoc(docId: string): void {
    this._send({ type: 'read_doc', docId });
  }

  private _send(msg: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.emit('error', new Error('Not connected'));
    }
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this._send({ type: 'ping' });
    }, 30000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this.retryCount >= this.options.maxRetries) {
      this.emit('error', new Error(`Max retries (${this.options.maxRetries}) reached`));
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => {
      this.emit('message', { type: 'reconnecting', attempt: this.retryCount });
      this._connect();
    }, delay);
  }
}
