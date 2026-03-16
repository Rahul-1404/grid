import * as Y from 'yjs';

/**
 * Extract plain text from a Yjs doc's default XmlFragment (Tiptap/ProseMirror structure).
 */
export function yDocToText(ydoc: Y.Doc): string {
  const fragment = ydoc.getXmlFragment('default');
  const lines: string[] = [];
  for (let i = 0; i < fragment.length; i++) {
    const node = fragment.get(i);
    lines.push(xmlNodeToText(node));
  }
  return lines.join('\n');
}

function xmlNodeToText(node: Y.XmlElement | Y.XmlText | Y.AbstractType<unknown>): string {
  if (node instanceof Y.XmlText) {
    return node.toString();
  }
  if (node instanceof Y.XmlElement) {
    const parts: string[] = [];
    for (let i = 0; i < node.length; i++) {
      const child = node.get(i);
      parts.push(xmlNodeToText(child));
    }
    return parts.join('');
  }
  return '';
}

/**
 * yDocToMarkdown — simple version, just returns plain text with headings as "# " etc.
 */
export function yDocToMarkdown(ydoc: Y.Doc): string {
  const fragment = ydoc.getXmlFragment('default');
  const lines: string[] = [];
  for (let i = 0; i < fragment.length; i++) {
    const node = fragment.get(i);
    if (node instanceof Y.XmlElement) {
      const text = xmlNodeToText(node);
      const nodeName = node.nodeName;
      if (nodeName === 'heading') {
        const level = node.getAttribute('level') || 1;
        lines.push('#'.repeat(Number(level)) + ' ' + text);
      } else if (nodeName === 'codeBlock') {
        lines.push('```\n' + text + '\n```');
      } else if (nodeName === 'bulletList' || nodeName === 'orderedList') {
        // Walk list items
        for (let j = 0; j < node.length; j++) {
          const li = node.get(j);
          const liText = xmlNodeToText(li);
          lines.push((nodeName === 'orderedList' ? `${j + 1}. ` : '- ') + liText);
        }
      } else {
        lines.push(text);
      }
    } else {
      lines.push(xmlNodeToText(node));
    }
  }
  return lines.join('\n');
}

// ---------- Helpers to create ProseMirror-compatible Yjs nodes ----------

function createParagraph(text: string): Y.XmlElement {
  const para = new Y.XmlElement('paragraph');
  if (text) {
    const t = new Y.XmlText();
    t.insert(0, text);
    para.insert(0, [t]);
  }
  return para;
}

function createHeading(text: string, level: number): Y.XmlElement {
  const heading = new Y.XmlElement('heading');
  heading.setAttribute('level', level as any);
  const t = new Y.XmlText();
  t.insert(0, text);
  heading.insert(0, [t]);
  return heading;
}

function createCodeBlock(text: string, language?: string): Y.XmlElement {
  const cb = new Y.XmlElement('codeBlock');
  if (language) {
    cb.setAttribute('language', language as any);
  }
  const t = new Y.XmlText();
  t.insert(0, text);
  cb.insert(0, [t]);
  return cb;
}

function createBulletList(items: string[]): Y.XmlElement {
  const list = new Y.XmlElement('bulletList');
  for (const item of items) {
    const li = new Y.XmlElement('listItem');
    const p = createParagraph(item);
    li.insert(0, [p]);
    list.insert(list.length, [li]);
  }
  return list;
}

function createOrderedList(items: string[]): Y.XmlElement {
  const list = new Y.XmlElement('orderedList');
  for (const item of items) {
    const li = new Y.XmlElement('listItem');
    const p = createParagraph(item);
    li.insert(0, [p]);
    list.insert(list.length, [li]);
  }
  return list;
}

function createBlockquote(text: string): Y.XmlElement {
  const bq = new Y.XmlElement('blockquote');
  const p = createParagraph(text);
  bq.insert(0, [p]);
  return bq;
}

/**
 * Parse markdown-like text into ProseMirror-compatible Yjs XmlElements.
 */
function parseMarkdownToNodes(text: string): Y.XmlElement[] {
  const lines = text.split('\n');
  const nodes: Y.XmlElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (``` ... ```)
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      nodes.push(createCodeBlock(codeLines.join('\n'), lang));
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      nodes.push(createHeading(headingMatch[2], headingMatch[1].length));
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      nodes.push(createBlockquote(line.slice(2)));
      i++;
      continue;
    }

    // Bullet list (collect consecutive - or * lines)
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      nodes.push(createBulletList(items));
      continue;
    }

    // Ordered list (collect consecutive 1. 2. lines)
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push(createOrderedList(items));
      continue;
    }

    // Empty line → empty paragraph
    if (line.trim() === '') {
      nodes.push(createParagraph(''));
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(createParagraph(line));
    i++;
  }

  return nodes;
}

/**
 * Insert text content into a Yjs doc as ProseMirror-compatible nodes.
 * Parses markdown-like syntax into proper Tiptap node types.
 * mode: 'append' | 'replace' | 'insert'
 */
export function insertTextToYDoc(
  ydoc: Y.Doc,
  text: string,
  mode: 'append' | 'replace' | 'insert' = 'append',
  position?: number
): void {
  const fragment = ydoc.getXmlFragment('default');

  ydoc.transact(() => {
    if (mode === 'replace') {
      while (fragment.length > 0) {
        fragment.delete(0, 1);
      }
    }

    const nodes = parseMarkdownToNodes(text);
    const insertAt = mode === 'insert' ? (position ?? 0) : fragment.length;

    for (let i = 0; i < nodes.length; i++) {
      fragment.insert(insertAt + i, [nodes[i]]);
    }
  });
}

/**
 * Seed a Yjs doc with initial text content (creates proper ProseMirror nodes).
 */
export function seedYDoc(ydoc: Y.Doc, content: string): void {
  insertTextToYDoc(ydoc, content, 'replace');
}
