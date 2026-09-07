// Vercel Routing Middleware: serves proper per-teacher Open Graph tags to
// social-media link-preview crawlers (WhatsApp, Telegram, Facebook, etc.),
// which don't execute JavaScript and would otherwise only ever see the
// site's generic index.html meta tags. Regular browser visits are left
// untouched and fall through to the normal single-page app.
//
// Deliberately excludes real search-engine crawlers (Googlebot, Bingbot,
// Applebot) — those render JavaScript and index the full app (reviews,
// ratings, JSON-LD structured data included), so serving them this
// stripped-down meta-only page would hurt indexing rather than help it.

const BOT_USER_AGENT_PATTERN =
  /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|skypeuripreview|vkshare|pinterest|redditbot|embedly|quora link preview/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SITE_URL = 'https://kursotzyv.org';

async function handleSitemap(): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let teacherIds: string[] = [];
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/teachers?select=id`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          teacherIds = rows.map((r) => r.id).filter(Boolean);
        }
      }
    } catch {
      // Ship a sitemap with just the homepage if the teacher lookup fails.
    }
  }

  const urls = [
    `  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...teacherIds.map(
      (id) =>
        `  <url><loc>${SITE_URL}/teacher/${encodeURIComponent(id)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === '/sitemap.xml') {
    return handleSitemap();
  }

  const userAgent = request.headers.get('user-agent') || '';
  if (!BOT_USER_AGENT_PATTERN.test(userAgent)) {
    return; // Not a known crawler — let the request through as normal.
  }

  const match = url.pathname.match(/^\/teacher\/([^/]+)\/?$/);
  if (!match) {
    return;
  }

  const teacherId = decodeURIComponent(match[1]);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const siteUrl = SITE_URL;
  const fallbackImage = `${siteUrl}/og-image.png`;

  let title = 'Kursotzyv.org';
  let description = 'Кыргызстандагы онлайн курстардын жана мугалимдердин чынчыл сын-пикирлери.';
  let image = fallbackImage;

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
          description = teacher.bio
            ? teacher.bio
            : `${teacher.name} тууралуу студенттердин чыныгы сын-пикирлерин окуңуз — Kursotzyv.org.`;
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

  const html = `<!doctype html>
<html lang="ky">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="${escapeHtml(url.toString())}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
  </head>
  <body></body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  matcher: ['/teacher/:path*', '/sitemap.xml'],
  runtime: 'edge',
};
