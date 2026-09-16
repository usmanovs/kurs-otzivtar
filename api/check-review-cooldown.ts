// Answers one question before a review is written: has this same source
// already reviewed this same teacher in the last 24 hours?
//
// Deliberately a cooldown, not a permanent block. A shared connection —
// common here on mobile carrier NAT, a school computer lab, an office wifi —
// can put many genuinely different people behind one public IP, and a
// permanent per-(IP, teacher) ban would silently stop a second real student
// from ever reviewing a teacher their classmate already reviewed. 24 hours
// is enough to stop the concrete pattern this exists for — the same source
// resubmitting minutes apart — without that collateral cost.
//
// Fails open: if this check itself errors (network blip, cold start), the
// submission is allowed rather than blocked. An anti-abuse check should
// never be the reason a genuine review is lost.

const COOLDOWN_HOURS = 24;

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: { teacherId?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const teacherId = body.teacherId;
  if (typeof teacherId !== 'string' || !teacherId) {
    return new Response('Missing teacherId', { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // An unresolved IP can't meaningfully collide with itself across
  // submissions, and blocking every "unknown"-IP submitter as if they were
  // one person would be its own false-positive machine.
  if (ip === 'unknown') {
    return Response.json({ allowed: true });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ allowed: true });
  }

  try {
    const since = new Date(Date.now() - COOLDOWN_HOURS * 3600 * 1000).toISOString();
    const url =
      `${supabaseUrl}/rest/v1/review_ip_log` +
      `?select=id` +
      `&teacher_id=eq.${encodeURIComponent(teacherId)}` +
      `&ip_address=eq.${encodeURIComponent(ip)}` +
      `&created_at=gte.${encodeURIComponent(since)}` +
      `&limit=1`;

    const res = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return Response.json({ allowed: true });

    const rows = (await res.json()) as unknown[];
    return Response.json({ allowed: rows.length === 0 });
  } catch (e) {
    console.error('Cooldown check failed', e);
    return Response.json({ allowed: true });
  }
}

export const config = {
  runtime: 'edge',
};
