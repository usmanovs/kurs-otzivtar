// Records one unique visit per browser per day into site_visits, plus one
// raw pageview per call into site_pageviews, via a same-origin endpoint
// instead of a direct client-side call to Supabase. A direct cross-origin
// fetch to *.supabase.co gets silently dropped by many ad blockers/privacy
// extensions (it looks like third-party analytics), which was undercounting
// real traffic. Routing through /api on kursotzyv.org itself avoids that,
// and using the service role key here means anon no longer needs any direct
// table policy on either table.

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: { visitorId?: unknown; heartbeat?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const visitorId = body.visitorId;
  const isValidUuid =
    typeof visitorId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId);

  if (!isValidUuid) {
    return new Response('Missing or invalid visitorId', { status: 400 });
  }

  const isHeartbeat = body.heartbeat === true;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };

    // Presence: refreshed on every ping (including the client heartbeat), so
    // "online now" reflects who is actually reading right now.
    try {
      await fetch(`${supabaseUrl}/rest/v1/site_presence`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ visitor_id: visitorId, last_seen_at: new Date().toISOString() }),
      });
    } catch (e) {
      console.error('Failed to record presence', e);
    }

    if (isHeartbeat) {
      return new Response(null, { status: 204 });
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/site_visits`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ visitor_id: visitorId }),
      });
    } catch (e) {
      console.error('Failed to record site visit', e);
    }

    try {
      await fetch(`${supabaseUrl}/rest/v1/site_pageviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.error('Failed to record pageview', e);
    }
  }

  return new Response(null, { status: 204 });
}

export const config = {
  runtime: 'edge',
};
