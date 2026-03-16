export interface DocProperty {
  id: string;
  name: string;
  type: 'text' | 'select' | 'multi-select' | 'date' | 'person' | 'url' | 'checkbox' | 'number';
  value: unknown;
  options?: string[]; // for select/multi-select
  color?: string;
}

export interface Document {
  id: string;
  title: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  parentId?: string | null;
  tags?: string[];
  properties?: DocProperty[];
  cover?: string;
}

export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'busy' | 'offline' | 'reconnecting';
  color: string;
  avatar?: string;
  capabilities?: string[];
  endpoint?: string;
  lastActivity?: string;
  currentDocId?: string;
  currentAction?: string;
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
}

export interface Person {
  id: string;
  name: string;
  email?: string;
  color: string;
  status: 'online' | 'offline';
  avatar?: string;
}

export interface Comment {
  id: string;
  documentId: string;
  text: string;
  quotedText: string;
  author: Person | Agent;
  isAgent: boolean;
  createdAt: string;
  resolved: boolean;
  selectionFrom: number;
  selectionTo: number;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  commentId: string;
  text: string;
  author: Person | Agent;
  isAgent: boolean;
  createdAt: string;
  isThinking?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  documents: Document[];
  createdAt: string;
  role?: 'owner' | 'member';
}

export type PanelView = 'none' | 'comments' | 'activity' | 'agent-detail';

export interface AgentActivity {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  detail: string;
  timestamp: string;
}
