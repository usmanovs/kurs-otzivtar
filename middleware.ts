// Vercel Routing Middleware: serves proper per-teacher and per-category Open
// Graph tags to social-media link-preview crawlers (WhatsApp, Telegram,
// Facebook, etc.), which don't execute JavaScript and would otherwise only
// ever see the site's generic index.html meta tags. Regular browser visits
// are left untouched and fall through to the normal single-page app.
//
// Deliberately excludes real search-engine crawlers (Googlebot, Bingbot,
// Applebot) — those render JavaScript and index the full app (reviews,
// ratings, JSON-LD structured data included), so serving them this
// stripped-down meta-only page would hurt indexing rather than help it.

import { TRANSLATIONS } from './src/translations';
import { ALL_CATEGORY_SLUGS_SET } from './src/lib/categories';
import { HIDDEN_TEACHER_IDS } from './src/lib/hiddenTeachers';
import { isProfileIndexable } from './src/lib/indexability';
import { ABOUT_LASTMOD, FAQ_LASTMOD, OG_IMAGE_URL } from './src/lib/site';

const BOT_USER_AGENT_PATTERN =
  /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|skypeuripreview|vkshare|pinterest|redditbot|embedly|quora link preview/i;


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SITE_URL = 'https://www.kursotzyv.org';

function buildPreviewHtml(opts: { title: string; description: string; image: string; url: string; ogType: string; lang: string }): string {
  const { title, description, image, url, ogType, lang } = opts;
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body></body>
</html>`;
}

interface RealSiteData {
  /** id -> newest review date (YYYY-MM-DD) */
  teachers: { id: string; lastmod: string; reviewCount: number; bio: string }[];
  /** slug -> newest review date among that category's teachers, '' if none */
  categories: { slug: string; lastmod: string }[];
  /** newest review date on the whole site */
  lastmod: string;
}

const EMPTY_SITE_DATA: RealSiteData = { teachers: [], categories: [], lastmod: '' };

const newest = (a: string, b: string) => (b > a ? b : a);

// The one real-data query both the sitemap and the prerender build step run
// (duplicated rather than imported — an edge function and a Node build
// script don't share a module graph — but kept to the same two rules: a
// category only counts once a teacher is actually assigned to it, and a
// teacher only counts once they have at least one published review. A
// profile with zero reviews is a stub with nothing for a crawler to index.
// <lastmod> is the newest review_date, i.e. when the page's content last
// actually changed — never the request time.
async function fetchRealSiteData(supabaseUrl: string, supabaseAnonKey: string): Promise<RealSiteData> {
  const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };
  const res = await fetch(`${supabaseUrl}/rest/v1/teachers?select=id,category,bio,reviews(review_date,is_hidden)`, { headers });
  if (!res.ok) return EMPTY_SITE_DATA;

  const rows = await res.json();
  if (!Array.isArray(rows)) return EMPTY_SITE_DATA;

  const teachers: { id: string; lastmod: string; reviewCount: number; bio: string }[] = [];
  const categoryLastmod = new Map<string, string>();
  let siteLastmod = '';
  for (const row of rows) {
    if (!row?.id || HIDDEN_TEACHER_IDS.has(row.id)) continue;
    // Hidden reviews don't count: a profile whose only reviews are hidden has
    // nothing published to index (and the build prerenders no page for it).
    const dates: string[] = Array.isArray(row.reviews)
      ? row.reviews
          .filter((r: { is_hidden?: boolean }) => !r?.is_hidden)
          .map((r: { review_date?: string }) => String(r?.review_date ?? '').slice(0, 10))
          .filter(Boolean)
      : [];
    const lastmod = dates.reduce(newest, '');
    if (dates.length > 0) {
      teachers.push({ id: row.id, lastmod, reviewCount: dates.length, bio: typeof row.bio === 'string' ? row.bio : '' });
      siteLastmod = newest(siteLastmod, lastmod);
    }
    if (row.category && ALL_CATEGORY_SLUGS_SET.has(row.category)) {
      categoryLastmod.set(row.category, newest(categoryLastmod.get(row.category) ?? '', lastmod));
    }
  }

  const categories = Array.from(ALL_CATEGORY_SLUGS_SET)
    .filter((slug) => categoryLastmod.has(slug))
    .map((slug) => ({ slug, lastmod: categoryLastmod.get(slug)! }));

  return { teachers, categories, lastmod: siteLastmod };
}

async function handleSitemap(): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let data = EMPTY_SITE_DATA;
  if (supabaseUrl && supabaseAnonKey) {
    try {
      data = await fetchRealSiteData(supabaseUrl, supabaseAnonKey);
    } catch {
      // Ship a sitemap with just the static pages if the lookup fails.
    }
  }

  // Every page exists in Kyrgyz (/…) and Russian (/ru/…); each URL lists both
  // as alternates, Kyrgyz doubling as x-default.
  const alternates = (path: string) => {
    const ky = `${SITE_URL}${path}`;
    const ru = `${SITE_URL}${path === '/' ? '/ru' : `/ru${path}`}`;
    return { ky, ru, links: `<xhtml:link rel="alternate" hreflang="ky" href="${ky}"/><xhtml:link rel="alternate" hreflang="ru" href="${ru}"/><xhtml:link rel="alternate" hreflang="x-default" href="${ky}"/>` };
  };
  const entries = (path: string, lastmod: string) => {
    const { ky, ru, links } = alternates(path);
    const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
    return [`  <url><loc>${ky}</loc>${lm}${links}</url>`, `  <url><loc>${ru}</loc>${lm}${links}</url>`];
  };

  const singleEntry = (loc: string, lastmod: string) =>
    `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;

  // /about and /faq are static copy with no data behind them: their dates are
  // constants that get bumped when the copy changes (see lib/site.ts).
  const urls = [
    ...entries('/', data.lastmod),
    ...entries('/reviews', data.lastmod),
    ...entries('/analytics', data.lastmod),
    ...entries('/about', ABOUT_LASTMOD),
    ...entries('/faq', FAQ_LASTMOD),
    ...data.categories.flatMap((c) => entries(`/category/${c.slug}`, c.lastmod)),
    // Thin profiles are noindex (see lib/indexability.ts), so they stay out of the
    // sitemap; a profile only lists a language twin when that twin is indexable too.
    ...data.teachers.flatMap((tch) => {
      const path = `/teacher/${encodeURIComponent(tch.id)}`;
      const ky = isProfileIndexable(tch, 'ky');
      const ru = isProfileIndexable(tch, 'ru');
      if (ky && ru) return entries(path, tch.lastmod);
      if (ky) return [singleEntry(`${SITE_URL}${path}`, tch.lastmod)];
      return [];
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}

const RU_PREFIX = '/ru';
const SHELL_PATH = '/_shell.html';
// Pages that exist as static routes (in both languages).
const STATIC_ROUTES = new Set(['/', '/reviews', '/analytics', '/about', '/faq']);
// Search and AI crawlers: the only visitors worth a database lookup to answer
// "does this teacher exist?" with a real status code.
const SEARCH_BOT_USER_AGENT_PATTERN =
  /googlebot|bingbot|yandex|duckduckbot|baiduspider|applebot|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|perplexitybot|ccbot/i;

/**
 * A real 404 for URLs that are not pages. The SPA rewrite answers every unknown
 * URL with the app shell and a 200, which search engines read as a "soft 404".
 * The body is still the shell, so a person who lands here sees the app's own
 * not-found page; only the status code (and noindex) change.
 */
async function notFoundResponse(request: Request): Promise<Response> {
  let body = '<!doctype html><html lang="ky"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>404</title></head><body>404</body></html>';
  try {
    // redirect: 'manual' so a protected deployment's sign-in redirect is never
    // followed and mistaken for the shell; and the body must actually be the app.
    const shell = await fetch(new URL(SHELL_PATH, request.url), { redirect: 'manual' });
    if (shell.ok) {
      const text = await shell.text();
      if (text.includes('<div id="root">')) body = text;
    }
  } catch {
    // Keep the minimal page.
  }
  return new Response(body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
}

async function teacherExists(id: string): Promise<boolean | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/teachers?id=eq.${encodeURIComponent(id)}&select=id,reviews(is_hidden)`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    // Same rule as the sitemap: no published review, no page to index.
    return rows.some(
      (row: { reviews?: { is_hidden?: boolean }[] }) =>
        Array.isArray(row.reviews) && row.reviews.some((r) => !r?.is_hidden)
    );
  } catch {
    return null; // Unknown — never turn a lookup failure into a 404.
  }
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === '/sitemap.xml') {
    return handleSitemap();
  }

  // Normalise: drop the trailing slash and the /ru language prefix.
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const isRu = path === RU_PREFIX || path.startsWith(`${RU_PREFIX}/`);
  const bare = isRu ? path.slice(RU_PREFIX.length) || '/' : path;
  const lang = isRu ? 'ru' : 'ky';
  const t = TRANSLATIONS[lang];

  const categoryMatch = bare.match(/^\/category\/([^/]+)$/);
  const teacherMatch = bare.match(/^\/teacher\/([^/]+)$/);
  const userAgent = request.headers.get('user-agent') || '';
  const isPreviewBot = BOT_USER_AGENT_PATTERN.test(userAgent);

  // --- Real 404s -----------------------------------------------------------
  if (!STATIC_ROUTES.has(bare) && !categoryMatch && !teacherMatch) {
    return notFoundResponse(request);
  }
  if (categoryMatch && !ALL_CATEGORY_SLUGS_SET.has(decodeURIComponent(categoryMatch[1]))) {
    return notFoundResponse(request);
  }
  if (teacherMatch) {
    const id = decodeURIComponent(teacherMatch[1]);
    // Hidden profiles are gone for everyone; unknown ids are checked only for
    // crawlers, so ordinary page views never pay for a database round trip.
    if (HIDDEN_TEACHER_IDS.has(id)) return notFoundResponse(request);
    if (SEARCH_BOT_USER_AGENT_PATTERN.test(userAgent) && (await teacherExists(id)) === false) {
      return notFoundResponse(request);
    }
  }

  // --- Link previews for social crawlers -------------------------------------
  if (!isPreviewBot) {
    return; // Everyone else: let the request through to the static page / SPA.
  }

  const siteUrl = SITE_URL;
  const fallbackImage = OG_IMAGE_URL;

  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const categoryName = t.categories[slug as keyof typeof t.categories];
    const title = `${categoryName} — Kursotzyv.org`;
    const description = t.categoryPage.metaDescription.replace('{category}', categoryName);

    const html = buildPreviewHtml({ title, description, image: fallbackImage, url: url.toString(), ogType: 'website', lang });
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (!teacherMatch) {
    return;
  }

  const teacherId = decodeURIComponent(teacherMatch[1]);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let title = 'Kursotzyv.org';
  let description = t.siteSubtitle + '.';
  let image = fallbackImage;

  // A hidden profile never reaches here (404 above), so the lookup is safe.
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/teachers?id=eq.${encodeURIComponent(teacherId)}&select=name,bio,photo_url`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }
      );
      if (res.ok) {
        const rows = await res.json();
        const teacher = Array.isArray(rows) ? rows[0] : null;
        if (teacher) {
          title = `${teacher.name} — Kursotzyv.org`;
          description = teacher.bio ? teacher.bio : t.teacherPage.metaDescriptionNoReviews.replace('{name}', teacher.name);
          if (teacher.photo_url) {
            image = teacher.photo_url.startsWith('http')
              ? teacher.photo_url
              : `${siteUrl}${teacher.photo_url}`;
          }
        }
      }
    } catch {
      // Fall through with generic site metadata if the lookup fails.
    }
  }

  const html = buildPreviewHtml({ title, description, image, url: url.toString(), ogType: 'profile', lang });

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  // The sitemap, plus every page navigation: anything with a file extension
  // (assets, images, robots.txt, llms.txt, …) and the API/asset folders are
  // left alone, so the 404 check above only ever sees real page URLs.
  matcher: ['/sitemap.xml', '/((?!api/|assets/|teachers/|flags/|screenshots/|_vercel/|.*\\..*).*)'],
  runtime: 'edge',
};
