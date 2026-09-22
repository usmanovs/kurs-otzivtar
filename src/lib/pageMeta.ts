import { SITE_URL } from './site';

/**
 * Sets document.title, the description meta tag, and the canonical link for
 * a standalone route (one that isn't App.tsx, which already does this
 * itself for /, /teacher/:id and /category/:slug). Without this, those
 * pages kept whatever index.html shipped statically — the homepage's title
 * and canonical — even after the route's own content had rendered.
 */
export function setPageMeta(opts: { title: string; description: string; path: string }): void {
  document.title = opts.title;

  const descriptionTag = document.querySelector('meta[name="description"]');
  descriptionTag?.setAttribute('content', opts.description);

  const canonicalTag = document.querySelector('link[rel="canonical"]');
  canonicalTag?.setAttribute('href', `${SITE_URL}${opts.path}`);
}
