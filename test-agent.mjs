// Smart agent that connects to Grid using Claude Code CLI for responses
import WebSocket from 'ws';
import { execSync } from 'child_process';

const API = 'http://localhost:3001';

function sendAndWait(ws, msg, responseType, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for ${responseType}`));
    }, timeoutMs);
    const handler = (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === responseType) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(parsed);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify(msg));
  });
}

async function main() {
  // 1. Register
  const res = await fetch(`${API}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Claude Code', capabilities: ['code', 'debugging', 'architecture', 'writing', 'docs'] }),
  });
  const { id, token, wsUrl } = await res.json();
  console.log(`✅ Registered as ${id}`);

  // 2. Connect via WebSocket
  const ws = new WebSocket(`${wsUrl}?token=${token}`);

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'auth', token }));
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'auth_ok') {
      console.log(`🟢 Connected as ${msg.agent.name} — waiting for @mentions...`);
      ws.send(JSON.stringify({ type: 'capabilities', skills: ['code', 'debugging', 'architecture', 'writing', 'docs'] }));
      ws.send(JSON.stringify({ type: 'status', status: 'ONLINE' }));

      // Demo: list available docs on connect
      try {
        const docsList = await sendAndWait(ws, { type: 'list_docs' }, 'docs_list');
        console.log(`📚 Found ${docsList.docs.length} docs:`);
        for (const doc of docsList.docs) {
          console.log(`   - ${doc.icon || '📄'} ${doc.title} (${doc.id})`);
        }

        // Read the first doc for context
        if (docsList.docs.length > 0) {
          const firstDoc = await sendAndWait(ws, { type: 'read_doc', docId: docsList.docs[0].id }, 'doc_content');
          console.log(`📖 Read "${firstDoc.title}": ${firstDoc.content.length} chars`);
        }
      } catch (err) {
        console.error(`❌ Doc list error: ${err.message}`);
      }
    }

    if (msg.type === 'mention') {
      console.log(`\n💬 @mentioned: "${msg.text}"`);
      console.log(`📝 Quoted: "${msg.quotedText?.slice(0, 80)}"`);
      console.log(`📄 Doc: ${msg.docContent ? msg.docContent.length + ' chars' : 'no content'}`);

      ws.send(JSON.stringify({ type: 'status', status: 'BUSY' }));

      try {
        // Get workspace context
        let docsList;
        try { docsList = await sendAndWait(ws, { type: 'list_docs' }, 'docs_list', 5000); } catch { docsList = { docs: [] }; }

        const docContext = msg.docContent ? `\nCurrent document content:\n${msg.docContent.slice(0, 2000)}` : '';
        const threadContext = msg.threadHistory?.length
          ? `\nConversation so far:\n${msg.threadHistory.map(m => `${m.name}: ${m.text}`).join('\n')}`
          : '';
        const docsContext = docsList.docs?.length ? `\nDocs in workspace: ${docsList.docs.map(d => `${d.title} (${d.id})`).join(', ')}` : '';

        // Single Claude call — let it decide what to do (respond, create doc, edit, etc.)
        const systemPrompt = `You are "Claude Code", an AI agent in a collaborative doc editor called Grid.
You have these capabilities via tool calls:
- RESPOND: Just reply to the user's comment
- CREATE_DOC: Create a new document (use when asked to write/draft/create a doc/page/document)
- EDIT_DOC: Edit/append to the current document
- LIST_DOCS: List all documents
- SEARCH_DOCS: Search across documents

IMPORTANT: Output your response as JSON with this format:
{"action":"RESPOND","reply":"your reply text"}
or {"action":"CREATE_DOC","title":"doc title","content":"markdown content","reply":"confirmation message"}
or {"action":"EDIT_DOC","content":"content to append","reply":"confirmation message"}
or {"action":"LIST_DOCS","reply":"formatted list"}

Always include a "reply" field — this is what the user sees in the comment thread.
For CREATE_DOC, generate substantial, well-structured markdown content (300-500 words).
For EDIT_DOC, generate the improved/new content.
Output ONLY the JSON, nothing else.`;

        const userPrompt = `${docContext}${docsContext}${threadContext}

Highlighted text: "${msg.quotedText || '(none)'}"
User's message: "${msg.text}"`;

        const raw = execSync(`claude -p --output-format json "${systemPrompt.replace(/"/g, '\\"').replace(/\n/g, ' ')} --- ${userPrompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
          encoding: 'utf-8',
          timeout: 45000,
          cwd: process.cwd(),
        }).trim();

        // Parse the response — try to extract JSON
        let parsed;
        try {
          // Try direct parse first
          parsed = JSON.parse(raw);
          // If it's the claude output format, extract the text
          if (parsed.result) parsed = JSON.parse(parsed.result);
        } catch {
          // Try to find JSON in the response
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
          }
        }

        if (!parsed || !parsed.action) {
          // Couldn't parse — just use raw text as reply
          ws.send(JSON.stringify({
            type: 'comment_reply', docId: msg.docId, commentId: msg.commentId,
            text: raw.replace(/```json\n?|\n?```/g, '').trim() || 'I processed your request but couldn\'t format the response.',
          }));
        } else if (parsed.action === 'CREATE_DOC') {
          console.log(`📝 Creating doc: "${parsed.title}"`);
          try {
            const result = await sendAndWait(ws, {
              type: 'create_doc', title: parsed.title || 'Untitled', content: parsed.content || '', icon: '🤖',
            }, 'doc_created', 5000);
            ws.send(JSON.stringify({
              type: 'comment_reply', docId: msg.docId, commentId: msg.commentId,
              text: parsed.reply || `Created "${result.title}" — check the sidebar!`,
            }));
          } catch {
            ws.send(JSON.stringify({
              type: 'comment_reply', docId: msg.docId, commentId: msg.commentId,
              text: parsed.reply || 'I generated the content but couldn\'t save it as a doc.',
            }));
          }
        } else if (parsed.action === 'EDIT_DOC') {
          console.log(`✏️ Editing doc`);
          try {
            await sendAndWait(ws, {
              type: 'edit_doc', docId: msg.docId || 'doc-1', action: 'append',
              content: `\n\n${parsed.content}`,
            }, 'doc_edited', 5000);
          } catch {}
          ws.send(JSON.stringify({
            type: 'comment_reply', docId: msg.docId, commentId: msg.commentId,
            text: parsed.reply || 'Done! I\'ve updated the document.',
          }));
        } else {
          // RESPOND, LIST_DOCS, SEARCH_DOCS, or anything else
          ws.send(JSON.stringify({
            type: 'comment_reply', docId: msg.docId, commentId: msg.commentId,
            text: parsed.reply || 'Done.',
          }));
        }

        console.log(`✍️  Action: ${parsed?.action || 'RESPOND'}`);
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        ws.send(JSON.stringify({
          type: 'comment_reply',
          docId: msg.docId,
          commentId: msg.commentId,
          text: `Sorry, I couldn't process that request.`,
        }));
      }

      ws.send(JSON.stringify({ type: 'status', status: 'ONLINE' }));
    }
  });

  ws.on('close', () => console.log('❌ Disconnected'));
  ws.on('error', (err) => console.error('Error:', err.message));
}

main().catch(console.error);
