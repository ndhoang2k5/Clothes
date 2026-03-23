export type BlogBlock =
  | { type: 'heading'; text: string; level: 1 | 2 | 3 }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  | { type: 'media_text'; imageUrl: string; imageAlt?: string; text: string; imagePosition: 'left' | 'right' }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'list'; style: 'bullet' | 'number'; items: string[] }
  | { type: 'divider' }
  | { type: 'spacer'; size: 'sm' | 'md' | 'lg' };

export type BlogRenderMeta = {
  heroIntro?: string;
  titleAlign?: 'left' | 'center';
  titleColor?: 'default' | 'brown';
};

type BlogDocumentV2 = {
  version: 2;
  meta?: BlogRenderMeta;
  blocks: BlogBlock[];
};

function isImageUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  const lowered = s.toLowerCase();
  const extOk = /\.(png|jpg|jpeg|webp|gif|bmp)(\?.*)?$/.test(lowered);
  const startsOk = lowered.startsWith('http://') || lowered.startsWith('https://') || lowered.startsWith('/static/');
  return extOk && startsOk;
}

function parseLegacyBlogContent(content: string): BlogBlock[] {
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

function sanitizeBlocks(input: unknown): BlogBlock[] {
  if (!Array.isArray(input)) return [];
  const out: BlogBlock[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const b = raw as any;
    if (b.type === 'heading') {
      const text = String(b.text || '').trim();
      const lv = Number(b.level || 2);
      const level = lv === 1 || lv === 2 || lv === 3 ? (lv as 1 | 2 | 3) : 2;
      if (text) out.push({ type: 'heading', text, level });
    } else if (b.type === 'paragraph') {
      const text = String(b.text || '').trim();
      if (text) out.push({ type: 'paragraph', text });
    } else if (b.type === 'image') {
      const url = String(b.url || '').trim();
      if (url) out.push({ type: 'image', url, alt: b.alt ? String(b.alt) : undefined, caption: b.caption ? String(b.caption) : undefined });
    } else if (b.type === 'media_text') {
      const imageUrl = String(b.imageUrl || '').trim();
      const text = String(b.text || '').trim();
      const imagePosition = b.imagePosition === 'right' ? 'right' : 'left';
      if (imageUrl || text) {
        out.push({
          type: 'media_text',
          imageUrl,
          imageAlt: b.imageAlt ? String(b.imageAlt) : undefined,
          text,
          imagePosition,
        });
      }
    } else if (b.type === 'quote') {
      const text = String(b.text || '').trim();
      if (text) out.push({ type: 'quote', text, author: b.author ? String(b.author) : undefined });
    } else if (b.type === 'list') {
      const style = b.style === 'number' ? 'number' : 'bullet';
      const items = Array.isArray(b.items) ? b.items.map((x: unknown) => String(x || '').trim()).filter(Boolean) : [];
      if (items.length > 0) out.push({ type: 'list', style, items });
    } else if (b.type === 'divider') {
      out.push({ type: 'divider' });
    } else if (b.type === 'spacer') {
      const size = b.size === 'sm' || b.size === 'lg' ? b.size : 'md';
      out.push({ type: 'spacer', size });
    }
  }
  return out;
}

function parseJsonBlogContent(content: string): BlogBlock[] | null {
  const text = String(content || '').trim();
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text) as Partial<BlogDocumentV2>;
    if (Number(parsed?.version) !== 2) return null;
    return sanitizeBlocks(parsed?.blocks);
  } catch {
    return null;
  }
}

function parseJsonBlogRenderMeta(content: string): BlogRenderMeta | null {
  const text = String(content || '').trim();
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text) as Partial<BlogDocumentV2>;
    if (Number(parsed?.version) !== 2) return null;
    const raw = parsed?.meta || {};
    const heroIntro = String((raw as any).heroIntro || '').trim();
    const titleAlign = (raw as any).titleAlign === 'center' ? 'center' : 'left';
    const titleColor = (raw as any).titleColor === 'brown' ? 'brown' : 'default';
    return {
      heroIntro: heroIntro || undefined,
      titleAlign,
      titleColor,
    };
  } catch {
    return null;
  }
}

export function parseBlogContent(content: string): BlogBlock[] {
  const jsonBlocks = parseJsonBlogContent(content);
  if (jsonBlocks) return jsonBlocks;
  return parseLegacyBlogContent(content);
}

export function parseBlogRenderMeta(content: string): BlogRenderMeta {
  return parseJsonBlogRenderMeta(content) || {
    heroIntro: undefined,
    titleAlign: 'left',
    titleColor: 'default',
  };
}

export function composeBlogContent(blocks: BlogBlock[], meta?: BlogRenderMeta): string {
  const safeBlocks = sanitizeBlocks(blocks);
  const normalizedMeta: BlogRenderMeta | undefined = meta
    ? {
        heroIntro: String(meta.heroIntro || '').trim() || undefined,
        titleAlign: meta.titleAlign === 'center' ? 'center' : 'left',
        titleColor: meta.titleColor === 'brown' ? 'brown' : 'default',
      }
    : undefined;
  const doc: BlogDocumentV2 = {
    version: 2,
    ...(normalizedMeta ? { meta: normalizedMeta } : {}),
    blocks: safeBlocks,
  };
  return JSON.stringify(doc, null, 2);
}

export function extractBlogPlainText(content: string, maxLength?: number): string {
  const blocks = parseBlogContent(content);
  const pieces: string[] = [];
  for (const b of blocks) {
    if (b.type === 'heading' || b.type === 'paragraph' || b.type === 'quote') {
      pieces.push(String(b.text || '').trim());
    } else if (b.type === 'media_text') {
      pieces.push(String(b.text || '').trim());
    } else if (b.type === 'list') {
      pieces.push(b.items.join(' '));
    }
  }
  const text = pieces.join(' ').replace(/\s+/g, ' ').trim();
  if (!maxLength || maxLength <= 0) return text;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
