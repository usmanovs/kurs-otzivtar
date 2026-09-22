// Emails the site owner when someone submits the /about contact form.
//
// The message itself is already durably stored in contact_messages by the
// client, straight to Supabase — this is purely a "come look" ping, so it
// fails silently rather than surfacing an error to the person who just
// wrote in. If RESEND_API_KEY is unset or the send fails, the message is
// still sitting in the Moderation panel; nothing is lost.

const NOTIFY_TO = 'usmanov.seyitbek@gmail.com';
const NOTIFY_FROM = 'Kursotzyv.org <notifications@kursotzyv.org>';

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email : '';
  const message = typeof body.message === 'string' ? body.message : '';
  const name = typeof body.name === 'string' && body.name ? body.name : 'Аноним';

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email || !message) {
    return new Response(null, { status: 204 });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        reply_to: email,
        subject: `Kursotzyv.org: жаңы кат — ${name}`,
        text: `Аты: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });
    if (!res.ok) {
      console.error('Resend notify failed', res.status, await res.text());
    }
  } catch (e) {
    console.error('Resend notify errored', e);
  }

  return new Response(null, { status: 204 });
}

export const config = {
  runtime: 'edge',
};
