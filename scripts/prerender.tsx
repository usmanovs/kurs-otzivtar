// Post-build step: renders real HTML for every content route into
// dist/<path>/index.html with react-dom/server, so the raw response already
// has the page's <h1>, text, links and JSON-LD in <body> — before any
// JavaScript runs — plus the per-route <title>, description, canonical and
// og/twitter tags. Vercel's static hosting serves an exact-path static file
// ahead of the SPA catch-all rewrite in vercel.json, so a brand-new teacher
// added after the last deploy (no file yet) still falls through to the normal
// client-rendered SPA exactly as before.
//
// Rendered here: /, /reviews, /analytics, /about, /category/:slug and
// /teacher/:id. Each page embeds its data as <script id="__PRERENDER__">;
// main.tsx hydrates when the visitor's saved language matches the rendered one
// (Kyrgyz), else renders client-side. Live values (online now, view counts)
// never block the build: they are baked in as last-known numbers (online now
// as 0, i.e. hidden) and the page refreshes them on mount.
//
// dist/index.html becomes the prerendered homepage, so the empty SPA shell is
// kept as dist/_shell.html and vercel.json rewrites unknown URLs to that —
// otherwise a not-yet-prerendered /teacher/<new-id> would be served homepage
// content.
//
// Runs through tsx so it imports the real components and mappers rather than
// keeping copies. Never fails the build: on error the SPA fallback serves
// every route as before.

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ALL_CATEGORY_SLUGS } from '../src/lib/categories';
import { TRANSLATIONS } from '../src/translations';
import { HIDDEN_TEACHER_IDS } from '../src/lib/hiddenTeachers';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { mapTeacherRow } from '../src/lib/mappers';
import { PrerenderContext, PrerenderData } from '../src/lib/prerenderData';
import { SITE_URL } from '../src/lib/site';
import { websiteJsonLd } from '../src/lib/structuredData';
import { buildCategoryIntro } from '../src/components/CategoryPage';
import { TeacherPage } from '../src/components/TeacherPage';
import { CategoryPage } from '../src/components/CategoryPage';
import { AboutFeaturesPage } from '../src/components/AboutFeaturesPage';
import { AllReviewsPage } from '../src/components/AllReviewsPage';
import { AnalyticsPage } from '../src/components/AnalyticsPage';
import App from '../src/App';
import type { Teacher } from '../src/types';
import { mapCourseRow, mapFeaturedVideoRow, REVIEWS_FEED_PAGE_SIZE } from '../src/lib/api';
import type { FeedReviewSummary, ReviewsFeedCounts, SiteStats } from '../src/lib/api';

dotenv.config({ path: '.env.local' });

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const CATEGORY_NAMES: Record<string, string> = TRANSLATIONS.ky.categories;

function supabaseEnv(): { url: string; headers: Record<string, string> } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/** GET a PostgREST table; [] on any failure so a hiccup never fails the build. */
async function restList(query: string): Promise<any[]> {
  const env = supabaseEnv();
  if (!env) return [];
  try {
    const res = await fetch(`${env.url}/rest/v1/${query}`, { headers: env.headers });
    const rows = res.ok ? await res.json() : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function rpcNumber(name: string): Promise<number | null> {
  const env = supabaseEnv();
  if (!env) return null;
  try {
    const res = await fetch(`${env.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { ...env.headers, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) return null;
    const n = Number(await res.json());
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Last-known activity numbers. Null if the counters can't be read — the block simply doesn't render. */
async function fetchLastKnownStats(all: Teacher[]): Promise<SiteStats | null> {
  const [visits, pageViews] = await Promise.all([rpcNumber('get_visits_last_24h'), rpcNumber('get_pageviews_last_24h')]);
  if (visits === null || pageViews === null) return null;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const reviewsLast7Days = all.flatMap((tch) => tch.reviews).filter((r) => r.createdAt && Date.parse(r.createdAt) >= weekAgo).length;
  // onlineNow is deliberately 0: "N people online" frozen at build time would
  // be a false claim in the static HTML. The block hides it until the client
  // reads the real number.
  return { onlineNow: 0, visitsLast24h: visits, pageViewsLast24h: pageViews, reviewsLast7Days };
}

/**
 * Listing pages (/, /analytics) never show review bodies, and inlined base64
 * photos alone were ~700 KB per page (they'd also be embedded twice: in the
 * markup and the payload). Both are dropped here; the client refetch after
 * hydration brings the full data in.
 */
function slimForListing(teachers: Teacher[]): Teacher[] {
  return teachers.map((tch) => ({
    ...tch,
    photoUrl: tch.photoUrl?.startsWith('data:') ? undefined : tch.photoUrl,
    reviews: tch.reviews.map((r) => ({ ...r, fullReview: '', adviceForNewcomers: undefined })),
  }));
}

/** First page of /reviews plus the filter-pill counts, from the teacher data already fetched. */
function buildFeed(all: Teacher[]): { reviews: FeedReviewSummary[]; hasMore: boolean; counts: ReviewsFeedCounts } {
  const feed: FeedReviewSummary[] = all
    .flatMap((tch) =>
      tch.reviews.map((r) => ({
        ...r,
        teacherId: tch.id,
        teacherName: tch.name,
        // Inlined data: photos would be repeated per review; the client
        // refetch brings them in.
        teacherPhotoUrl: tch.photoUrl && !tch.photoUrl.startsWith('data:') ? tch.photoUrl : undefined,
      }))
    )
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return {
    reviews: feed.slice(0, REVIEWS_FEED_PAGE_SIZE),
    hasMore: feed.length > REVIEWS_FEED_PAGE_SIZE,
    counts: {
      all: feed.length,
      recommended: feed.filter((r) => r.overallRating >= 4).length,
      critical: feed.filter((r) => r.overallRating <= 2).length,
      verified: feed.filter((r) => r.proofVerified).length,
    },
  };
}

async function fetchAllTeachers(): Promise<Teacher[]> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[prerender] Missing Supabase env vars — skipping teacher/category prerender.');
    return [];
  }
  const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };
  const res = await fetch(`${supabaseUrl}/rest/v1/teachers?select=*,reviews(*)&order=created_at.desc`, { headers });
  if (!res.ok) {
    console.warn('[prerender] Teacher fetch failed:', res.status);
    return [];
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row?.id && !HIDDEN_TEACHER_IDS.has(row.id)).map(mapTeacherRow);
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface PageMeta {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
}

function injectHead(template: string, { title, description, canonicalPath, image }: PageMeta): string {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image || `${SITE_URL}/og-image.png`);

  return template
    .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${safeDescription}" />`)
    .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${safeTitle}" />`)
    .replace(
      /<meta property="og:description" content=".*?" \/>/,
      `<meta property="og:description" content="${safeDescription}" />`
    )
    .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonicalUrl}" />`)
    .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${safeImage}" />`)
    .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${safeTitle}" />`)
    .replace(
      /<meta name="twitter:description" content=".*?" \/>/,
      `<meta name="twitter:description" content="${safeDescription}" />`
    )
    .replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${safeImage}" />`)
    .replace(/<link rel="canonical" href=".*?" \/>/, `<link rel="canonical" href="${canonicalUrl}" />`);
}

const LANG = 'ky';

/** Escapes < so JSON embedded in a <script> can't close it early. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function renderApp(url: string, data: PrerenderData): string {
  return renderToString(
    <PrerenderContext.Provider value={data}>
      <StaticRouter location={url}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/reviews" element={<AllReviewsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/teacher/:teacherId" element={<TeacherPage />} />
          <Route path="/category/:categorySlug" element={<CategoryPage />} />
          <Route path="/about" element={<AboutFeaturesPage />} />
        </Routes>
      </StaticRouter>
    </PrerenderContext.Provider>
  );
}

function writeHtml(routeDir: string, html: string): void {
  const outDir = path.join(DIST_DIR, routeDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`[prerender] wrote /${routeDir}`);
}

/** Head-only page: same shell as the SPA, with this route's meta tags. */
function writeRoute(template: string, routeDir: string, meta: PageMeta): void {
  writeHtml(routeDir, injectHead(template, meta));
}

const BUILT_AT = new Date().toISOString();

/** Full page: meta tags + the server-rendered body + the data to hydrate with. */
function writeRendered(
  template: string,
  routeDir: string,
  meta: PageMeta,
  data: Omit<PrerenderData, 'route' | 'builtAt'>,
  extraHead = ''
): void {
  const route = `/${routeDir}`;
  const payload: PrerenderData = { ...data, route, builtAt: BUILT_AT };
  const body = renderApp(route, payload);
  const rootShell = /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>)/;
  if (!rootShell.test(template)) throw new Error('dist/index.html has an unexpected shape');
  const html = injectHead(template, meta)
    .replace('</head>', () => `${extraHead}</head>`)
    .replace(rootShell, () =>
      `<div id="root" data-prerendered="1" data-lang="${LANG}" data-path="${route}">${body}</div>\n    <script id="__PRERENDER__" type="application/json">${safeJson(payload)}</script>\n  `
    );
  writeHtml(routeDir, html);
}

async function main(): Promise<void> {
  const indexPath = path.join(DIST_DIR, 'index.html');
  const shellPath = path.join(DIST_DIR, '_shell.html');
  if (!fs.existsSync(shellPath)) {
    if (!fs.existsSync(indexPath)) {
      console.warn('[prerender] dist/index.html not found — run `vite build` first. Skipping.');
      return;
    }
    // The untouched SPA shell: what unknown URLs fall back to (see vercel.json).
    fs.copyFileSync(indexPath, shellPath);
  }
  const template = fs.readFileSync(shellPath, 'utf8');
  const ky = TRANSLATIONS.ky;

  const all = await fetchAllTeachers();
  const withReviews = all.filter((tch) => tch.reviewCount > 0);
  const categorySlugs = ALL_CATEGORY_SLUGS.filter((slug) => all.some((tch) => tch.category === slug));

  writeRendered(
    template,
    'about',
    {
      title: 'Бул платформа кантип иштейт — Kursotzyv.org',
      description: 'Ар бир бөлүм чыныгы иштеп жаткан функцияны сүрөттөйт — жарнама үчүн эмес.',
      canonicalPath: '/about',
    },
    { teachers: [] }
  );

  // Data-backed pages need the teacher data; without it (Supabase unreachable
  // at build) they stay client-rendered rather than shipping an empty listing.
  if (all.length > 0) {
    const [courses, videoRows, siteStats] = await Promise.all([
      restList('courses?select=*&order=created_at.desc').then((rows) => rows.map(mapCourseRow)),
      restList('featured_videos?select=*&order=added_at.desc').then((rows) => rows.map(mapFeaturedVideoRow)),
      fetchLastKnownStats(all),
    ]);
    writeRendered(
      template,
      '',
      {
        title: 'Kursotzyv.org - Кыргызстандагы онлайн курстардын сын-пикирлери',
        description:
          'Кыргызстандагы онлайн жана IT курстардын ачык жана чынчыл сын-пикирлери, студенттердин пикирлери жана сапат рейтинги.',
        canonicalPath: '/',
      },
      { teachers: slimForListing(all), courses, featuredVideos: videoRows, siteStats },
      `    <script type="application/ld+json">${safeJson(
        websiteJsonLd('Kursotzyv.org', 'Кыргызстандагы онлайн жана IT курстардын чыныгы сын-пикирлери', 'ky')
      )}</script>\n  `
    );
    writeRendered(
      template,
      'reviews',
      { title: `${ky.allReviewsPage.title} — Kursotzyv.org`, description: ky.allReviewsPage.subtitle, canonicalPath: '/reviews' },
      { teachers: [], feed: buildFeed(all) }
    );
    writeRendered(
      template,
      'analytics',
      { title: `${ky.analyticsPage.title} — Kursotzyv.org`, description: ky.analyticsPage.intro, canonicalPath: '/analytics' },
      { teachers: slimForListing(all) }
    );
  } else {
    for (const r of ['reviews', 'analytics']) {
      const p = r === 'reviews' ? ky.allReviewsPage : ky.analyticsPage;
      writeRoute(template, r, {
        title: `${p.title} — Kursotzyv.org`,
        description: 'subtitle' in p ? p.subtitle : (p as any).intro,
        canonicalPath: `/${r}`,
      });
    }
  }

  for (const slug of categorySlugs) {
    const name = CATEGORY_NAMES[slug];
    // The list only needs names and rating numbers; drop review bodies and
    // inlined photos so the embedded payload stays small.
    const inCategory = all
      .filter((tch) => tch.category === slug)
      .map((tch) => ({
        ...tch,
        photoUrl: undefined,
        reviews: tch.reviews.map((r) => ({ overallRating: r.overallRating }) as Teacher['reviews'][number]),
      }));
    const intro = buildCategoryIntro(slug as never, inCategory, LANG);
    writeRendered(
      template,
      `category/${slug}`,
      {
        title: `${name} ${ky.categoryPage.headingSuffix} — Kursotzyv.org`,
        description: intro.framing,
        canonicalPath: `/category/${slug}`,
      },
      { teachers: inCategory }
    );
  }

  for (const teacher of withReviews) {
    const description = ky.teacherPage.metaDescription
      .replace('{name}', teacher.name)
      .replace('{rating}', teacher.averageRating.toFixed(1))
      .replace('{count}', String(teacher.reviewCount));
    const image = teacher.photoUrl && !teacher.photoUrl.startsWith('data:')
      ? teacher.photoUrl.startsWith('http') ? teacher.photoUrl : `${SITE_URL}${teacher.photoUrl}`
      : undefined;
    writeRendered(
      template,
      `teacher/${encodeURIComponent(teacher.id)}`,
      { title: `${teacher.name} — Kursotzyv.org`, description, canonicalPath: `/teacher/${encodeURIComponent(teacher.id)}`, image },
      { teachers: [teacher] }
    );
  }

  console.log(
    `[prerender] done: /, /reviews, /analytics, /about, ${categorySlugs.length} categories, ${withReviews.length} teachers.`
  );
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  // Never fail the whole build over prerendering — the SPA fallback in
  // vercel.json still serves every route correctly without it.
});
