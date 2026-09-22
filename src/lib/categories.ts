import { TRANSLATIONS } from '../translations';

// The one list of "real" category slugs — every consumer that needs to
// answer "is this a real category?" reads this instead of keeping its own
// copy. It drifted before: App.tsx's own hardcoded subset was missing
// 'youtube' and 'sewing_fashion' (added to translations.ts later and never
// backfilled there), so those two categories' own pages 404'd and got
// noindexed even though the homepage and sitemap both linked to them
// correctly. 'all' is a filter pseudo-category and 'unknown' is a curation
// outcome ("we looked and couldn't tell") — neither is a real subject a
// category page can render, so both are excluded here.
const EXCLUDED_SLUGS = new Set(['all', 'unknown']);

export const ALL_CATEGORY_SLUGS: readonly string[] = Object.keys(TRANSLATIONS.ky.categories).filter(
  (slug) => !EXCLUDED_SLUGS.has(slug)
);

export const ALL_CATEGORY_SLUGS_SET: ReadonlySet<string> = new Set(ALL_CATEGORY_SLUGS);
