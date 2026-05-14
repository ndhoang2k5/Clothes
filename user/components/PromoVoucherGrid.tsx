import React, { useCallback, useMemo, useState } from 'react';
import type { HomepagePromoCard } from '../../types';
import { getSavedVoucherCodes, toggleSavedVoucherCode } from '../utils/savedVoucherCodes';

type ThemeKey = 'amber' | 'blue' | 'rose' | 'violet';

const THEME_STYLES: Record<
  ThemeKey,
  { accent: string; btn: string; checkBg: string; checkFg: string; border: string }
> = {
  amber: {
    accent: '#7A4429',
    btn: 'bg-[#7A4429] hover:bg-[#5C321F]',
    checkBg: '#B45309',
    checkFg: '#fff',
    border: 'border-[#B58A5A]/85',
  },
  blue: {
    accent: '#1e3a5f',
    btn: 'bg-blue-700 hover:bg-blue-800',
    checkBg: '#1D4ED8',
    checkFg: '#fff',
    border: 'border-blue-500/60',
  },
  rose: {
    accent: '#7f1d1d',
    btn: 'bg-rose-700 hover:bg-rose-800',
    checkBg: '#BE123C',
    checkFg: '#fff',
    border: 'border-rose-400/70',
  },
  violet: {
    accent: '#4c1d95',
    btn: 'bg-violet-700 hover:bg-violet-800',
    checkBg: '#6D28D9',
    checkFg: '#fff',
    border: 'border-violet-400/70',
  },
};

function normalizeTheme(raw: string | undefined): ThemeKey {
  const k = String(raw || '').toLowerCase();
  if (k === 'blue' || k === 'rose' || k === 'violet' || k === 'amber') return k;
  return 'amber';
}

/**
 * Vé ngang: bo góc + một khía bán nguyệt nhỏ giữa cạnh trái/phải (kiểu coupon),
 * không răng cưa dày — khi kéo giãn mask, mép vẫn gọn, không “đè” nội dung.
 */
function buildTwinSideNotchTicketPath(params: {
  W: number;
  H: number;
  inset: number;
  rCorner: number;
  rNotch: number;
}): string {
  const { W, H, inset, rCorner, rNotch } = params;
  const x0 = inset;
  const y0 = inset;
  const x1 = W - inset;
  const y1 = H - inset;
  const cy = (y0 + y1) / 2;
  const cyTop = y0 + (y1 - y0) * 0.285;
  const p: string[] = [];
  /** Khía hai bên: nửa vòng tròn lõm vào trong, tâm trên mép (x1,cy) / (x0,cy) → rNotch đúng tỷ lệ khi scale. */
  p.push(`M ${x0} ${y0 + rCorner}`);
  p.push(`A ${rCorner} ${rCorner} 0 0 1 ${x0 + rCorner} ${y0}`);
  p.push(`L ${x1 - rCorner} ${y0}`);
  p.push(`A ${rCorner} ${rCorner} 0 0 1 ${x1} ${y0 + rCorner}`);
  // notch 1 (gần góc trên, cạnh ô giảm %)
  p.push(`L ${x1} ${cyTop - rNotch}`);
  p.push(`A ${rNotch} ${rNotch} 0 1 0 ${x1} ${cyTop + rNotch}`);
  // notch 2 (giữa thẻ)
  p.push(`L ${x1} ${cy - rNotch}`);
  p.push(`A ${rNotch} ${rNotch} 0 1 0 ${x1} ${cy + rNotch}`);
  p.push(`L ${x1} ${y1 - rCorner}`);
  p.push(`A ${rCorner} ${rCorner} 0 0 1 ${x1 - rCorner} ${y1}`);
  p.push(`L ${x0 + rCorner} ${y1}`);
  p.push(`A ${rCorner} ${rCorner} 0 0 1 ${x0} ${y1 - rCorner}`);
  // notch 2 (giữa thẻ)
  p.push(`L ${x0} ${cy + rNotch}`);
  p.push(`A ${rNotch} ${rNotch} 0 1 0 ${x0} ${cy - rNotch}`);
  // notch 1 (gần góc trên, cạnh ô giảm %)
  p.push(`L ${x0} ${cyTop + rNotch}`);
  p.push(`A ${rNotch} ${rNotch} 0 1 0 ${x0} ${cyTop - rNotch}`);
  p.push(`L ${x0} ${y0 + rCorner}`);
  p.push('Z');
  return p.join(' ');
}

/** viewBox rộng > cao (~3:2) để mask không kéo phình răng theo chiều dọc. */
const TICKET_VB = { w: 120, h: 78 } as const;
const TICKET_CFG = {
  inset: 1.5,
  rCorner: 3.75,
  /** bán kính khía nhỏ so với chiều cao → chỉ lõm nhẹ hai bên */
  rNotch: 3.0,
} as const;

let _cachedMaskUrl: string | null = null;
let _cachedMaskKey = '';

function getTicketMaskUrl(): string {
  const key = `tn-${TICKET_VB.w}-${TICKET_VB.h}-${TICKET_CFG.inset}-${TICKET_CFG.rCorner}-${TICKET_CFG.rNotch}`;
  if (_cachedMaskUrl && _cachedMaskKey === key) return _cachedMaskUrl;
  _cachedMaskKey = key;
  const d = buildTwinSideNotchTicketPath({
    W: TICKET_VB.w,
    H: TICKET_VB.h,
    inset: TICKET_CFG.inset,
    rCorner: TICKET_CFG.rCorner,
    rNotch: TICKET_CFG.rNotch,
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TICKET_VB.w} ${TICKET_VB.h}" preserveAspectRatio="none"><path fill="white" d="${d}"/></svg>`;
  _cachedMaskUrl = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  return _cachedMaskUrl;
}

function primaryOfferText(discount: string, condition: string): string {
  const d = String(discount || '').trim();
  const c = String(condition || '').trim();
  if (!c) return d;
  const cLower = c.charAt(0).toLowerCase() + c.slice(1);
  if (!d) return c;
  return `${d} cho ${cLower}`;
}

/** Tách phần số K để tô đỏ (VD: 299K, 1.000K). */
function ConditionLine(props: { text: string; title: string }) {
  const { text, title } = props;
  const m = text.match(/^(.+?)(\d[\d.]*\s*K)(.*)$/i);
  if (!m) {
    return (
      <p
        className="mt-1 text-center text-xs font-bold leading-snug text-[#5C4337] sm:text-sm"
        title={title}
      >
        {text}
      </p>
    );
  }
  return (
    <p className="mt-1 text-center leading-snug" title={title}>
      <span className="text-xs font-bold text-[#5C4337] sm:text-sm">{m[1]}</span>
      <span className="text-base font-black text-[#A52A2A] sm:text-lg md:text-xl"> {m[2].trim()} </span>
      <span className="text-xs font-bold text-[#5C4037] sm:text-sm">{m[3]}</span>
    </p>
  );
}

function PromoTicketCard(props: {
  card: HomepagePromoCard;
  saved: boolean;
  onToggleSave: () => void;
  onTerms: () => void;
}) {
  const { card, saved, onToggleSave, onTerms } = props;
  const t = THEME_STYLES[normalizeTheme(card.card_theme)];
  const pctMatch = card.discount_label.match(/^(\s*Giảm\s*)(.+)$/i);
  const hasPercentStyle = /\d/.test(card.discount_label) && card.discount_label.includes('%');
  const ticketMask = getTicketMaskUrl();
  const MAX_BENEFITS = 3;
  const benefitLines = useMemo(() => {
    const raw = Array.isArray(card.benefits) ? card.benefits.filter(Boolean) : [];
    if (raw.length <= MAX_BENEFITS) return raw;
    const head = raw.slice(0, MAX_BENEFITS);
    head[MAX_BENEFITS - 1] = `+${raw.length - (MAX_BENEFITS - 1)} ưu đãi khác`;
    return head;
  }, [card.benefits]);

  return (
    <div
      className="relative aspect-[120/100] w-[min(68vw,252px)] max-w-[252px] shrink-0 snap-center snap-always md:w-full md:max-w-none md:flex-none md:snap-none md:min-w-0"
    >
      {/* drop-shadow bám theo mép mask → hiện rõ “răng cưa/khía” */}
      <div
        className="h-full"
        style={{
          filter:
            'drop-shadow(0 0 0.9px rgba(122,68,41,0.40)) drop-shadow(0 10px 22px rgba(122,68,41,0.10))',
        }}
      >
        <div
          className="relative box-border flex h-full flex-col overflow-hidden bg-[#FAF8F5] text-[#5D4037]"
          style={{
            WebkitMaskImage: ticketMask,
            // Tránh bị “cắt đáy” 1–2px khi zoom/DPR: nới mask lớn hơn 100% một chút.
            WebkitMaskSize: '102% 102%',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: ticketMask,
            maskSize: '102% 102%',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
          }}
        >
          <div className="box-border flex flex-col px-2.5 pb-1.5 pt-2 sm:px-3 sm:pt-2.5 sm:pb-2">
          {card.code && (
            <p className="mb-1 text-[10px] font-bold tracking-wide text-[#8B5A45] sm:text-[11px]">
              Mã:{' '}
              <span className="font-mono uppercase text-[#6B4423]">{card.code}</span>
            </p>
          )}
          <div
            className={`rounded-xl border ${t.border} bg-white px-2.5 py-2 text-center shadow-sm sm:px-3 sm:py-2.5`}
          >
            {hasPercentStyle && pctMatch ? (
              <div className="flex flex-wrap items-baseline justify-center gap-x-0.5 gap-y-0">
                <span
                  className="text-xs font-bold sm:text-sm md:text-base"
                  style={{ color: t.accent }}
                >
                  Giảm{' '}
                </span>
                <span className="text-[1.65rem] font-black leading-none tracking-tight text-[#A52A2A] sm:text-4xl md:text-[2.125rem]">
                  {String(pctMatch[2] || '').trim()}
                </span>
              </div>
            ) : (
              <div
                className="text-base font-black leading-tight sm:text-lg md:text-xl"
                style={{ color: t.accent }}
              >
                {card.discount_label}
              </div>
            )}
            {card.condition_label && (
              <ConditionLine
                text={card.condition_label}
                title={primaryOfferText(card.discount_label, card.condition_label)}
              />
            )}
          </div>

          <ul className="mt-2 space-y-0.5 text-left text-[10px] leading-snug text-[#5c4e45] sm:space-y-1 sm:text-[11px]">
            {Array.from({ length: MAX_BENEFITS }).map((_, i) => {
              const line = benefitLines[i] || '';
              const isEmpty = !line;
              return (
                <li key={i} className={`flex gap-1.5 sm:gap-2 ${isEmpty ? 'invisible' : ''}`}>
                  <span
                    className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[6px] font-black sm:h-4 sm:w-4 sm:text-[7px]"
                    style={{ backgroundColor: t.checkBg, color: t.checkFg }}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span>{line || '—'}</span>
                </li>
              );
            })}
          </ul>
        </div>

          <div className="relative mt-auto box-border flex shrink-0 items-center justify-between gap-2 bg-[#F3EFE9]/95 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
          <div
            aria-hidden
            className="pointer-events-none absolute left-3 right-3 top-0 border-t border-dashed border-[#C9B8A8]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-2 top-0 h-2 w-2 -translate-y-1/2 rounded-full border border-[#C9B8A8] bg-[#FFF9F1]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-2 top-0 h-2 w-2 -translate-y-1/2 rounded-full border border-[#C9B8A8] bg-[#FFF9F1]"
          />
          <button
            type="button"
            onClick={onTerms}
            className="min-w-0 text-left text-[10px] font-bold leading-snug text-[#5D4037] hover:text-[#7A4429] hover:underline underline-offset-2 sm:text-xs"
          >
            Điều kiện áp dụng
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-sm sm:px-3 sm:py-1.5 sm:text-xs ${t.btn}`}
            aria-pressed={saved}
          >
            {saved ? 'Đã lưu' : 'Lưu mã'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromoVoucherGrid(props: { cards: HomepagePromoCard[] }) {
  const { cards } = props;
  const [termsFor, setTermsFor] = useState<HomepagePromoCard | null>(null);
  const [savedTick, setSavedTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const savedSet = useMemo(() => {
    void savedTick;
    return new Set(getSavedVoucherCodes());
  }, [savedTick]);

  const bumpSaved = useCallback(() => setSavedTick((x) => x + 1), []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  if (!cards.length) return null;

  return (
    <section className="bg-[#FFF9F1] py-6 md:py-8 border-y border-[#E5D6C4]/40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5 md:mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-[#4B3B32] tracking-tight">
              Ưu đãi nổi bật
            </h2>
            <p className="text-gray-600 mt-1 text-sm md:text-base max-w-xl">
              Bấm <strong className="text-[#4B3B32]">Lưu mã</strong> để giữ mã trên thiết bị; nhập mã khi thanh toán tại giỏ hàng.{' '}
            </p>
          </div>
        </div>

        {/* Mobile: carousel ngang | md+: lưới */}
        <div className="md:pb-1">
          <div
            className="hide-scrollbar flex gap-3 overflow-x-auto scroll-smooth pt-2 pb-3 pl-0 pr-1 snap-x snap-mandatory touch-pan-x [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:p-0 md:snap-none"
            style={{ scrollPaddingInline: '1rem' }}
          >
            {cards.map((card) => (
              <PromoTicketCard
                key={card.id}
                card={card}
                saved={savedSet.has(String(card.code || '').trim().toUpperCase())}
                onToggleSave={() => {
                  const nowSaved = toggleSavedVoucherCode(card.code);
                  bumpSaved();
                  showToast(
                    nowSaved
                      ? `Đã lưu mã ${card.code} — dùng tại giỏ hàng`
                      : `Đã bỏ mã ${card.code}`,
                  );
                }}
                onTerms={() => setTermsFor(card)}
              />
            ))}
          </div>
        </div>
      </div>

      {termsFor && (
        <div
          className="fixed inset-0 z-[75] bg-black/35 flex items-center justify-center px-4"
          onClick={() => setTermsFor(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-[#E5D6C4] shadow-2xl p-5 md:p-6 text-[#4B3B32]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="promo-terms-title"
          >
            <div className="flex justify-between gap-3 mb-3">
              <h3 id="promo-terms-title" className="text-lg font-black text-[#4B3B32]">
                Điều kiện áp dụng
              </h3>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-gray-200 font-black text-gray-500 hover:bg-gray-50"
                onClick={() => setTermsFor(null)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {termsFor.terms_text?.trim()
                ? termsFor.terms_text
                : 'Mã có hiệu lực trong khung thời gian admin cấu hình và tuân theo điều kiện đơn hàng trên thẻ. Không áp dụng đồng thời nếu hệ thống giới hạn. Liên hệ fanpage Unbee nếu cần hỗ trợ.'}
            </p>
            <p className="mt-3 text-xs text-gray-500 font-bold">Mã: {termsFor.code}</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[76] px-4 py-2.5 rounded-full bg-[#3B2C24] text-white text-sm font-bold shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
