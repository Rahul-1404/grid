import WebSocket from 'ws';
import { registerAgent } from './agent-registry.js';

const RESPONSES: Record<string, string> = {
  help: "I'm Grid Assistant! I can help you navigate the workspace, answer questions about documents, and provide writing suggestions. Just @mention me in a comment!",
  hello: "Hello! I'm the Grid Assistant. How can I help you today?",
  review: "I'd be happy to review that section. Let me take a look... The content looks good overall. Consider adding more specific examples to strengthen the argument.",
  expand: "I can expand on that! Here's a more detailed version with additional context and supporting points.",
  summarize: "Here's a concise summary of the key points from the selected text.",
  default: "Thanks for reaching out! I've noted your comment and will look into it. Let me know if you need anything specific.",
};

function getResponse(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, response] of Object.entries(RESPONSES)) {
    if (keyword !== 'default' && lower.includes(keyword)) return response;
  }
  return RESPONSES.default;
}

export function startDemoAgent() {
  const { id, token } = registerAgent('Grid Assistant', ['writing', 'research', 'help']);
  console.log(`[demo-agent] Registered as "${id}"`);

  // Connect via WebSocket after a short delay to let server start
  setTimeout(() => {
    const ws = new WebSocket('ws://localhost:3001/agent');

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    });

    ws.on('message', (raw) => {
      let msg: any;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'auth_ok') {
        console.log(`[demo-agent] Authenticated as ${msg.agent.name}`);
        ws.send(JSON.stringify({ type: 'capabilities', skills: ['writing', 'research', 'help'] }));
        ws.send(JSON.stringify({ type: 'status', status: 'ONLINE' }));
      }

      if (msg.type === 'mention') {
        const reply = getResponse(msg.text);
        // Simulate thinking delay
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'comment_reply',
            docId: msg.docId,
            commentId: msg.commentId,
            text: reply,
          }));
        }, 1000 + Math.random() * 1500);
      }

      if (msg.type === 'dm') {
        const reply = getResponse(msg.text);
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'send',
            channelId: 'general',
            text: reply,
          }));
        }, 800);
      }
    });

    ws.on('error', (err) => {
      console.error('[demo-agent] Connection error:', err.message);
    });

    ws.on('close', () => {
      console.log('[demo-agent] Disconnected');
    });
  }, 500);
}
