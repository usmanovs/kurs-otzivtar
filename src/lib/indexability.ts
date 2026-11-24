import type { SupportedLang } from '../translations';

/**
 * Which teacher profiles are worth asking a search engine to index.
 *
 * A profile with one imported comment and no bio is ~120 words of template
 * around a single sentence; Google crawled dozens of them and declined to
 * index them ("Crawled/Discovered – currently not indexed"). Those pages stay
 * public and linked, but they are marked noindex and left out of the sitemap
 * until they have something of their own.
 *
 * The Russian copy of a profile shows the same review text as the Kyrgyz one
 * (reviews are not translated), so it needs more substance before it counts as
 * a page in its own right.
 *
 * The prerender (meta robots, hreflang) and the sitemap both call this, so the
 * two can never disagree — a sitemap URL marked noindex is its own GSC error.
 */
export const MIN_REVIEWS: Record<SupportedLang, number> = { ky: 2, ru: 3 };
export const MIN_BIO_CHARS = 40;

export function isProfileIndexable(
  profile: { reviewCount: number; bio?: string },
  lang: SupportedLang
): boolean {
  if (profile.reviewCount < 1) return false;
  if (lang === 'ru') return profile.reviewCount >= MIN_REVIEWS.ru;
  return profile.reviewCount >= MIN_REVIEWS.ky || (profile.bio ?? '').trim().length >= MIN_BIO_CHARS;
}
