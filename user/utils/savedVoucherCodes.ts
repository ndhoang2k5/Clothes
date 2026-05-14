const STORAGE_KEY = 'unbee_saved_voucher_codes';

export function getSavedVoucherCodes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return [...new Set(p.map((x) => String(x || '').trim().toUpperCase()).filter(Boolean))];
  } catch {
    return [];
  }
}

export function setSavedVoucherCodes(codes: string[]): void {
  const norm = [...new Set(codes.map((c) => String(c || '').trim().toUpperCase()).filter(Boolean))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(norm));
}

/** Trả về true nếu sau thao tác mã đang được lưu. */
export function toggleSavedVoucherCode(code: string): boolean {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return false;
  const cur = getSavedVoucherCodes();
  const has = cur.includes(c);
  if (has) setSavedVoucherCodes(cur.filter((x) => x !== c));
  else setSavedVoucherCodes([...cur, c]);
  return !has;
}

export function isVoucherCodeSaved(code: string): boolean {
  const c = String(code || '').trim().toUpperCase();
  return c.length > 0 && getSavedVoucherCodes().includes(c);
}
