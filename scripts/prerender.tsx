// Post-build step: renders real HTML for every content route into
// dist/<path>/index.html with react-dom/server, so the raw response already
// has the page's <h1>, text, links and JSON-LD in <body> — before any
// JavaScript runs — plus the per-route <title>, description, canonical and
// og/twitter tags. Vercel's static hosting serves an exact-path static file
// ahead of the SPA catch-all rewrite in vercel.json, so a brand-new teacher
// added after the last deploy (no file yet) still falls through to the normal
// client-rendered SPA exactly as before.
//
// Rendered here, in both languages (Kyrgyz at /…, Russian at /ru/…): /,
// /reviews, /analytics, /about, /faq, /category/:slug and /teacher/:id. Each
// page embeds its data as <script id="__PRERENDER__"> and links its other-
// language twin with hreflang; main.tsx hydrates when the HTML's language and
// path match the URL. Live values (online now, view counts)
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
import { mapTeacherRow } from '../src/lib/mappers';
import { PrerenderContext, PrerenderData } from '../src/lib/prerenderData';
import { OG_IMAGE_URL, SITE_URL } from '../src/lib/site';
import { homeJsonLd } from '../src/lib/structuredData';
import { getUnusualActivity } from '../src/lib/unusualActivity';
import { buildCategoryIntro } from '../src/components/CategoryPage';
import { AppRoutes } from '../src/AppRoutes';
import { localePath } from '../src/lib/i18n';
import { computeKeyFacts } from '../src/lib/keyFacts';
import type { SupportedLang } from '../src/translations';
import type { Teacher } from '../src/types';
import { mapCourseRow, mapFeaturedVideoRow, REVIEWS_FEED_PAGE_SIZE } from '../src/lib/api';
import type { FeedReviewSummary, ReviewsFeedCounts, SiteStats } from '../src/lib/api';

dotenv.config({ path: '.env.local' });

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const CATEGORY_NAMES: Record<string, string> = TRANSLATIONS.ky.categories;
const LANGS: SupportedLang[] = ['ky', 'ru'];

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
  const safeImage = escapeHtml(image || OG_IMAGE_URL);

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

/** Escapes < so JSON embedded in a <script> can't close it early. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function renderApp(url: string, data: PrerenderData): string {
  return renderToString(
    <PrerenderContext.Provider value={data}>
      <StaticRouter location={url}>
        <AppRoutes />
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

/** Every page URL written this build — what gets submitted to IndexNow. */
const writtenUrls: string[] = [];

/**
 * Machine-readable index of every rated profile, for answer engines
 * (see public/llms.txt). Same inclusion rule as the sitemap: hidden profiles
 * and profiles without reviews are left out.
 */
function buildLlmsFull(rated: Teacher[]): string {
  const lines = [
    '# Kursotzyv.org — rated instructors',
    '',
    `> ${rated.length} instructors with at least one published review. Generated ${BUILT_AT.slice(0, 10)}. Ratings are 1–5 stars from student reviews; they are opinions, and reviews without a proof badge are unverified. Overview: https://www.kursotzyv.org/llms.txt`,
    '',
  ];
  const facts = computeKeyFacts(rated);
  if (facts) {
    lines.push(
      `As of ${facts.date} (date of the newest review): ${facts.teachers} instructors and ${facts.reviews} published reviews; ${facts.criticalPercent}% of reviews are critical (1–2 stars) and ${facts.recommendPercent}% of authors recommend their instructor. Russian versions of every page are under https://www.kursotzyv.org/ru/.`,
      ''
    );
  }
  const byCategory = new Map<string, Teacher[]>();
  for (const tch of rated) {
    const key = tch.category ?? 'other';
    byCategory.set(key, [...(byCategory.get(key) ?? []), tch]);
  }
  for (const [slug, list] of byCategory) {
    lines.push(`## ${slug === 'other' ? 'Other' : CATEGORY_NAMES[slug] ?? slug}`);
    for (const tch of [...list].sort((a, b) => b.reviewCount - a.reviewCount)) {
      const note = getUnusualActivity(tch)
        ? ' — NOTE: unusual burst of unverified 5-star reviews, see profile'
        : '';
      lines.push(
        `- [${tch.name}](${SITE_URL}/teacher/${tch.id}): ${tch.averageRating.toFixed(1)}/5 from ${tch.reviewCount} reviews, ${tch.recommendPercent}% recommend${note}`
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

const OG_LOCALE: Record<SupportedLang, string> = { ky: 'ky_KG', ru: 'ru_RU' };

/** Where a bare route ('', 'about', 'teacher/x') lives for a language. */
const dirFor = (lang: SupportedLang, route: string) => (lang === 'ru' ? ['ru', route].filter(Boolean).join('/') : route);

/**
 * Full page: meta tags + the server-rendered body + the data to hydrate with.
 * `route` is language-neutral; the same route is written once per language and
 * each copy links the other with hreflang (Kyrgyz doubles as x-default).
 */
function writeRendered(
  template: string,
  route: string,
  lang: SupportedLang,
  meta: Omit<PageMeta, 'canonicalPath'>,
  data: Omit<PrerenderData, 'route' | 'builtAt'>,
  extraHead = ''
): void {
  const urlPath = localePath(`/${route}`, lang);
  const payload: PrerenderData = { ...data, route: urlPath, builtAt: BUILT_AT };
  const body = renderApp(urlPath, payload);
  const rootShell = /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>)/;
  if (!rootShell.test(template)) throw new Error('dist/index.html has an unexpected shape');
  const alt = (l: SupportedLang) => `${SITE_URL}${localePath(`/${route}`, l)}`;
  const alternates = [
    `    <link rel="alternate" hreflang="ky" href="${alt('ky')}" />`,
    `    <link rel="alternate" hreflang="ru" href="${alt('ru')}" />`,
    `    <link rel="alternate" hreflang="x-default" href="${alt('ky')}" />`,
    `    <meta property="og:locale" content="${OG_LOCALE[lang]}" />`,
    `    <meta property="og:locale:alternate" content="${OG_LOCALE[lang === 'ky' ? 'ru' : 'ky']}" />`,
  ].join('\n');
  const html = injectHead(template, { ...meta, canonicalPath: urlPath })
    .replace('<html lang="ky">', `<html lang="${lang}">`)
    .replace('</head>', () => `${alternates}\n${extraHead}</head>`)
    .replace(rootShell, () =>
      `<div id="root" data-prerendered="1" data-lang="${lang}" data-path="${urlPath}">${body}</div>\n    <script id="__PRERENDER__" type="application/json">${safeJson(payload)}</script>\n  `
    );
  writeHtml(dirFor(lang, route), html);
  writtenUrls.push(`${SITE_URL}${urlPath}`);
}

/**
 * Tells Bing, Yandex and the other IndexNow engines which URLs exist, so new
 * pages (a new teacher, the /ru twins) are crawled within hours instead of
 * whenever a crawler next comes round. Production builds only — a local or
 * preview build must not announce URLs — and never fatal. The key file lives at
 * /<key>.txt (public/), which is how the engines verify the site is ours.
 */
const INDEXNOW_KEY = 'e9acb2046c1b150e8cba82ab513ab99f';
async function submitToIndexNow(urls: string[]): Promise<void> {
  if (process.env.VERCEL_ENV !== 'production' || urls.length === 0) return;
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    console.log(`[prerender] IndexNow: submitted ${urls.length} URLs -> HTTP ${res.status}`);
  } catch (err) {
    console.warn('[prerender] IndexNow submission failed (ignored):', err);
  }
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

  const all = await fetchAllTeachers();
  const withReviews = all.filter((tch) => tch.reviewCount > 0);
  const categorySlugs = ALL_CATEGORY_SLUGS.filter((slug) => all.some((tch) => tch.category === slug));

  if (withReviews.length > 0) {
    fs.writeFileSync(path.join(DIST_DIR, 'llms-full.txt'), buildLlmsFull(withReviews));
    console.log('[prerender] wrote /llms-full.txt');
  }

  // Data-backed pages need the teacher data; without it (Supabase unreachable
  // at build) they stay client-rendered rather than shipping an empty listing.
  const haveData = all.length > 0;
  const [courses, videoRows, siteStats] = haveData
    ? await Promise.all([
        restList('courses?select=*&order=created_at.desc').then((rows) => rows.map(mapCourseRow)),
        restList('featured_videos?select=*&order=added_at.desc').then((rows) => rows.map(mapFeaturedVideoRow)),
        fetchLastKnownStats(all),
      ])
    : [[], [], null];

  // Other rated instructors in the same category, most-reviewed first — the
  // internal links that give a teacher page somewhere to send a crawler (it had
  // two links: home and its category).
  const relatedFor = (teacher: Teacher) =>
    withReviews
      .filter((o) => o.id !== teacher.id && teacher.category && o.category === teacher.category)
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 6)
      .map((o) => ({ id: o.id, name: o.name }));

  let pages = 0;
  for (const lang of LANGS) {
    const t = TRANSLATIONS[lang];

    // Static pages: no data behind them.
    writeRendered(template, 'about', lang, { title: `${t.aboutPage.title} — Kursotzyv.org`, description: t.aboutPage.subtitle }, { teachers: [] });
    writeRendered(template, 'faq', lang, { title: t.faqPage.metaTitle, description: t.faqPage.metaDescription }, { teachers: [] });
    pages += 2;

    if (haveData) {
      writeRendered(
        template,
        '',
        lang,
        { title: t.homeTitle, description: t.homeMetaDescription },
        { teachers: slimForListing(all), courses, featuredVideos: videoRows, siteStats },
        `    <script type="application/ld+json">${safeJson(homeJsonLd(t.siteSubtitle, lang))}</script>\n  `
      );
      writeRendered(
        template,
        'reviews',
        lang,
        { title: `${t.allReviewsPage.title} — Kursotzyv.org`, description: t.allReviewsPage.subtitle },
        { teachers: [], feed: buildFeed(all) }
      );
      writeRendered(
        template,
        'analytics',
        lang,
        { title: `${t.analyticsPage.title} — Kursotzyv.org`, description: t.analyticsPage.intro },
        { teachers: slimForListing(all) }
      );
      pages += 3;
    }

    for (const slug of categorySlugs) {
      // The list only needs names and rating numbers; drop review bodies and
      // inlined photos so the embedded payload stays small.
      const inCategory = all
        .filter((tch) => tch.category === slug)
        .map((tch) => ({
          ...tch,
          photoUrl: undefined,
          reviews: tch.reviews.map(
            (r) =>
              ({ overallRating: r.overallRating, createdAt: r.createdAt, wouldRecommend: r.wouldRecommend }) as Teacher['reviews'][number]
          ),
        }));
      const intro = buildCategoryIntro(slug as never, inCategory, lang);
      writeRendered(
        template,
        `category/${slug}`,
        lang,
        { title: t.categoryPage.metaTitle.replace('{category}', t.categories[slug as keyof typeof t.categories]), description: intro.framing },
        { teachers: inCategory }
      );
      pages++;
    }

    for (const teacher of withReviews) {
      const description = t.teacherPage.metaDescription
        .replace('{name}', teacher.name)
        .replace('{rating}', teacher.averageRating.toFixed(1))
        .replace('{count}', String(teacher.reviewCount));
      const image = teacher.photoUrl && !teacher.photoUrl.startsWith('data:')
        ? teacher.photoUrl.startsWith('http') ? teacher.photoUrl : `${SITE_URL}${teacher.photoUrl}`
        : undefined;
      writeRendered(
        template,
        `teacher/${encodeURIComponent(teacher.id)}`,
        lang,
        { title: t.teacherPage.metaTitle.replace('{name}', teacher.name), description, image },
        { teachers: [teacher], related: relatedFor(teacher) }
      );
      pages++;
    }
  }

  await submitToIndexNow(writtenUrls);

  console.log(
    `[prerender] done: ${pages} pages (${LANGS.join(' + ')}): home, reviews, analytics, about, faq, ${categorySlugs.length} categories, ${withReviews.length} teachers per language.`
  );
}

main().catch((err) => {
  console.error('[prerender] failed:', err);
  // Never fail the whole build over prerendering — the SPA fallback in
  // vercel.json still serves every route correctly without it.
});
