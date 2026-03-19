export type BlogBlock =
  | { type: 'image'; url: string; alt?: string }
  | { type: 'paragraph'; text: string };

function isImageUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  const lowered = s.toLowerCase();
  const extOk = /\.(png|jpg|jpeg|webp|gif|bmp)(\?.*)?$/.test(lowered);
  const startsOk = lowered.startsWith('http://') || lowered.startsWith('https://') || lowered.startsWith('/static/');
  return extOk && startsOk;
}

/**
 * Parse blog `content` as plain text where:
 * - Each image URL on its own line becomes an image block.
 * - Text is split into paragraphs by blank lines.
 *
 * This lets admin store multiple images without changing DB schema.
 */
export function parseBlogContent(content: string): BlogBlock[] {
  const text = String(content || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  const blocks: BlogBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const joined = paragraphLines.map((l) => l.trim()).filter(Boolean).join(' ');
    if (joined) blocks.push({ type: 'paragraph', text: joined });
    paragraphLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    if (isImageUrl(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'image', url: trimmed });
      continue;
    }
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

export function composeBlogContent(blocks: BlogBlock[]): string {
  const out: string[] = [];

  for (const b of blocks) {
    if (b.type === 'image') {
      if (b.url && String(b.url).trim()) out.push(String(b.url).trim());
      // one line per image
      continue;
    }
    // paragraph block
    out.push(String(b.text || '').trim());
    out.push(''); // blank line to separate paragraphs
  }

  // Ensure no trailing spaces; keep newlines important for parsing.
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

