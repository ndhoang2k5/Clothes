import type { Blog } from '../../types';

export type BlogSectionSlug =
  | 'tin-tuc'
  | 'tram-sac-cua-me'
  | 'cam-nang-me-be'
  | 'goc-nho-bat-mi';

export const BLOG_NAV_SECTIONS: ReadonlyArray<{
  slug: BlogSectionSlug;
  label: string;
}> = [
  { slug: 'tin-tuc', label: 'Tin tức' },
  { slug: 'tram-sac-cua-me', label: 'Trạm sạc của mẹ' },
  { slug: 'cam-nang-me-be', label: 'Cẩm nang mẹ & bé' },
  { slug: 'goc-nho-bat-mi', label: 'Góc nhỏ bật mí' },
];

const LEGACY_TO_SECTION: Record<string, BlogSectionSlug> = {
  news: 'tin-tuc',
  tips: 'tin-tuc',
  share: 'tin-tuc',
  charity: 'tin-tuc',
  intro: 'tin-tuc',
};

export function normalizeBlogSectionSlug(input: string | null | undefined): BlogSectionSlug {
  const raw = String(input || '').trim();
  if (BLOG_NAV_SECTIONS.some((s) => s.slug === raw)) {
    return raw as BlogSectionSlug;
  }
  return LEGACY_TO_SECTION[raw] || 'tin-tuc';
}

export function getBlogSection(slug: BlogSectionSlug) {
  return BLOG_NAV_SECTIONS.find((s) => s.slug === slug) ?? BLOG_NAV_SECTIONS[0];
}

export function getBlogSectionLabel(slug: BlogSectionSlug): string {
  return getBlogSection(slug).label;
}

export function blogSectionPath(slug: BlogSectionSlug): string {
  return `/blogs?category=${encodeURIComponent(slug)}`;
}

export function isIntroBlog(post: Pick<Blog, 'category'>): boolean {
  return String(post.category || '').trim() === 'intro';
}
