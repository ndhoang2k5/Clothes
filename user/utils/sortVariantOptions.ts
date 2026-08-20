/**
 * Sắp xếp size biến thể từ nhỏ → lớn (tháng / năm / S-M-L).
 * Hỗ trợ dạng: 6-9, 9-12, 12-18, 18-24, 2-3y, 0-3m, 6 tháng, 01, S/M/L...
 */

const LETTER_SIZE_ORDER: Record<string, number> = {
  xs: 900,
  s: 910,
  m: 920,
  l: 930,
  xl: 940,
  xxl: 950,
  '2xl': 960,
  '3xl': 970,
};

function parseLeadingNumber(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Trả về “tháng tương đương” để so sánh; càng nhỏ = size càng bé. */
export function sizeSortKey(size: string): number {
  const s = (size || '').trim().toLowerCase();
  if (!s) return Number.MAX_SAFE_INTEGER;

  // 2-3y, 2-3 y
  let m = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*y\b/);
  if (m) {
    const start = parseLeadingNumber(m[1]);
    if (start != null) return start * 12;
  }

  // 0-3m, 6-9m
  m = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*m\b/);
  if (m) {
    const start = parseLeadingNumber(m[1]);
    if (start != null) return start;
  }

  // 6-9, 12-18 (mặc định theo tháng)
  m = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const start = parseLeadingNumber(m[1]);
    const end = parseLeadingNumber(m[2]);
    if (start != null) {
      // 2-3 không có đơn vị: coi là năm nếu cả hai <= 6
      if (start <= 6 && end != null && end <= 6 && end > start) {
        return start * 12;
      }
      return start;
    }
  }

  m = s.match(/^(\d+(?:\.\d+)?)\s*y\b/);
  if (m) {
    const n = parseLeadingNumber(m[1]);
    if (n != null) return n * 12;
  }

  m = s.match(/^(\d+(?:\.\d+)?)\s*tháng/);
  if (m) {
    const n = parseLeadingNumber(m[1]);
    if (n != null) return n;
  }

  m = s.match(/^(\d+(?:\.\d+)?)\s*m\b/);
  if (m) {
    const n = parseLeadingNumber(m[1]);
    if (n != null) return n;
  }

  if (LETTER_SIZE_ORDER[s] != null) return LETTER_SIZE_ORDER[s];

  m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) {
    const n = parseLeadingNumber(m[1]);
    if (n != null) return n;
  }

  return 8000 + s.charCodeAt(0);
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const diff = sizeSortKey(a) - sizeSortKey(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b, 'vi', { sensitivity: 'base' });
  });
}

export function sortColors(colors: string[]): string[] {
  return [...colors].sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
}

export function uniqueSortedSizes(sizes: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of sizes) {
    const v = (raw || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return sortSizes(out);
}

export function uniqueSortedColors(colors: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of colors) {
    const v = (raw || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return sortColors(out);
}
