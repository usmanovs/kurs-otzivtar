// Records the submitter's IP address against a review for spam/abuse detection
// only (e.g. one person submitting many reviews in a burst). This is never
// exposed to any client: the review_ip_log table has RLS enabled with no
// policies, so only this server-side function (using the service role key)
// can read or write it. The public review data and UI never reference it.

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/review_ip_log`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ review_id: reviewId, ip_address: ip }),
      });
    } catch (e) {
      console.error('Failed to log review IP', e);
    }
  }

  return new Response(null, { status: 204 });
}

export const config = {
  runtime: 'edge',
};
