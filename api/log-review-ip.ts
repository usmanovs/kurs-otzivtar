// Records submission metadata for a review:
//  - Precise IP + timestamp go to review_ip_log, for spam/abuse detection only
//    (e.g. one source submitting many reviews in a burst). That table has RLS
//    restricted to the admin owner — never joined into any public fetch.
//  - Country and city (from Vercel's edge geo headers — no external IP
//    lookup needed) are written to reviews.country/reviews.city instead, and
//    shown publicly next to the review by explicit site-owner choice.

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: { reviewId?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const reviewId = body.reviewId;
  if (typeof reviewId !== 'string' || !reviewId) {
    return new Response('Missing reviewId', { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const country = request.headers.get('x-vercel-ip-country') || null;
  const rawCity = request.headers.get('x-vercel-ip-city');
  const city = rawCity ? decodeURIComponent(rawCity) : null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    try {
      await fetch(`${supabaseUrl}/rest/v1/review_ip_log`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ review_id: reviewId, ip_address: ip }),
      });
    } catch (e) {
      console.error('Failed to log review IP', e);
    }

    if (country || city) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(reviewId)}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ ...(country ? { country } : {}), ...(city ? { city } : {}) }),
        });
      } catch (e) {
        console.error('Failed to set review country/city', e);
      }
    }
  }

  return new Response(null, { status: 204 });
}

export const config = {
  runtime: 'edge',
};
