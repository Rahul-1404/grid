import { getAllAgents, sendToAgent, getAgent } from './agent-registry.js';
import { getYDocText } from './yjs-server.js';

let socketIOBroadcast: ((event: string, data: unknown) => void) | null = null;

export function setCommentBroadcast(fn: (event: string, data: unknown) => void) {
  socketIOBroadcast = fn;
}

/**
 * Check if the author of this comment is an agent (for agent-to-agent routing).
 */
function isAgentAuthor(authorId: string): boolean {
  return !!getAgent(authorId);
}

/**
 * Find all @mentioned agent IDs from text.
 */
function findMentionedAgents(text: string): string[] {
  const textLower = text.toLowerCase();
  const agents = getAllAgents();
  const matched: string[] = [];

  for (const agent of agents) {
    const nameLower = agent.name.toLowerCase();
    const nameHyphen = nameLower.replace(/\s+/g, '-');
    const nameNoSpace = nameLower.replace(/\s+/g, '');

    if (
      textLower.includes(`@${nameLower}`) ||
      textLower.includes(`@${nameHyphen}`) ||
      textLower.includes(`@${nameNoSpace}`)
    ) {
      matched.push(agent.id);
    }
  }

  return matched;
}

/**
 * Parse @mentions from comment text and route to agents.
 * Supports both human-to-agent and agent-to-agent mentions.
 */
export function routeCommentToAgents(comment: {
  id: string;
  documentId: string;
  text: string;
  quotedText: string;
  docContent?: string;
  threadHistory?: { role: string; name: string; text: string }[];
  author: { id: string; name: string };
}) {
  const mentionedAgentIds = findMentionedAgents(comment.text);
  const fromAgent = isAgentAuthor(comment.author.id);

  if (mentionedAgentIds.length === 0) {
    console.log(`[comment-bridge] No agent matched in: "${comment.text}"`);
    return;
  }

  // Get doc content for context if not provided
  let docContent = comment.docContent;
  if (!docContent) {
    try {
      docContent = getYDocText(comment.documentId);
    } catch {
      docContent = '';
    }
  }

  for (const agentId of mentionedAgentIds) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    // Build full thread history including agent-to-agent context
    const threadHistory = comment.threadHistory || [];

    const payload: any = {
      type: 'mention',
      docId: comment.documentId,
      commentId: comment.id,
      from: comment.author,
      fromAgent, // indicates this mention came from another agent
      text: comment.text,
      quotedText: comment.quotedText,
      docContent,
      threadHistory,
    };

    const delivered = sendToAgent(agent.id, payload);

    if (delivered) {
      const source = fromAgent ? 'agent' : 'human';
      console.log(`[comment-bridge] Routing ${source} mention to agent "${agent.name}" (${agent.id})`);

      // Broadcast activity for agent-to-agent collaboration visibility
      if (fromAgent && socketIOBroadcast) {
        socketIOBroadcast('agent:activity', {
          id: `act-${Date.now()}`,
          agentId: comment.author.id,
          agentName: comment.author.name,
          action: `asked ${agent.name} via @mention`,
          detail: comment.text.slice(0, 100),
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      console.log(`[comment-bridge] Agent "${agent.name}" offline — queued for delivery`);
      if (socketIOBroadcast) {
        socketIOBroadcast('agent:queued', {
          agentId: agent.id,
          agentName: agent.name,
          commentId: comment.id,
          message: `${agent.name} is offline. Your message has been queued — they'll respond when back online.`,
        });
      }
    }
  }
}
