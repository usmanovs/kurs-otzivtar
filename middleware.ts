// Vercel Routing Middleware: serves proper per-teacher Open Graph tags to
// social-media link-preview crawlers (WhatsApp, Telegram, Facebook, etc.),
// which don't execute JavaScript and would otherwise only ever see the
// site's generic index.html meta tags. Regular browser visits are left
// untouched and fall through to the normal single-page app.

const BOT_USER_AGENT_PATTERN =
  /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot|skypeuripreview|vkshare|pinterest|redditbot|embedly|quora link preview|w3c_validator/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!BOT_USER_AGENT_PATTERN.test(userAgent)) {
    return; // Not a known crawler — let the request through as normal.
  }

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/teacher\/([^/]+)\/?$/);
  if (!match) {
    return;
  }

  const teacherId = decodeURIComponent(match[1]);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const siteUrl = 'https://kursotzyv.org';
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
  matcher: '/teacher/:path*',
  runtime: 'edge',
};
