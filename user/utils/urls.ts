export function slugify(input: string): string {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseIdFromSlug(segment: string): string {
  const s = String(segment || '').trim();
  const m = s.match(/^(\d+)(?:-|$)/);
  return m ? m[1] : '';
}

export function buildProductPath(product: { id: string | number; slug?: string; name?: string }): string {
  const id = String(product?.id ?? '').trim();
  const slug = String(product?.slug || slugify(product?.name || '')).trim();
  const suffix = slug ? `-${slug}` : '';
  return `/products/${encodeURIComponent(id)}${suffix}`;
}

export function buildBlogPostPath(post: {
  id: string | number;
  slug?: string;
  title?: string;
  category?: string;
}): string {
  const id = String(post?.id ?? '').trim();
  const category = String(post?.category || 'tin-tuc').trim() || 'tin-tuc';
  const slug = String(post?.slug || slugify(post?.title || '')).trim();
  const suffix = slug ? `-${slug}` : '';
  return `/blogs/${encodeURIComponent(category)}/${encodeURIComponent(id)}${suffix}`;
}

export function getSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search || '');
}

