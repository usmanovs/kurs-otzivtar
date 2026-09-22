import { supabase } from './supabaseClient';

// The only account allowed to edit existing teacher profiles.
// Enforced for real by the "owner update teachers" RLS policy in Supabase —
// this constant only controls whether the UI *offers* the edit action.
export const ADMIN_EMAIL = 'usmanov.seyitbek@gmail.com';

export async function sendAdminLoginCode() {
  const { error } = await supabase.auth.signInWithOtp({
    email: ADMIN_EMAIL,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifyAdminLoginCode(code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: ADMIN_EMAIL,
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

/**
 * Same OTP mechanism as admin login, pointed at an arbitrary reviewer's
 * address instead of the fixed admin one. Used to confirm a real inbox
 * behind a positive review before it publishes — someone faking praise for
 * themselves or a friend has to also control an email account for it.
 *
 * `shouldCreateUser: true` (the admin flow's opposite) because a reviewer is
 * never pre-registered the way the admin is.
 */
export async function sendReviewEmailCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyReviewEmailCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
  // verifyOtp signs this browser in as that email — useful for nothing here,
  // since the check is "can they read this inbox," not "should they have an
  // account." Drop the session immediately so a reviewer never notices they
  // were briefly signed in, and so isAdmin (which reads the same session)
  // can't even momentarily see a non-admin email as anything but signed out.
  await supabase.auth.signOut();
}

/**
 * The account version of the same code: this time the point IS to end up
 * signed in, so unlike verifyReviewEmailCode the session is kept. Reuses
 * sendReviewEmailCode to send it — sending is identical either way; only
 * what happens after verifying differs.
 */
export async function verifySignInCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
}

export async function signOutUser() {
  await supabase.auth.signOut();
}

/**
 * Redirects the whole page to Google's consent screen and back — unlike the
 * OTP flows above there's no code to verify here, Supabase handles the
 * token exchange itself once the browser lands back on this origin, and the
 * existing onAuthStateChange listener in App.tsx picks up the new session.
 *
 * Requires the Google provider to be turned on in the Supabase dashboard
 * (Authentication -> Providers -> Google) with a Google Cloud OAuth client
 * ID/secret configured there — that part can't be done from this codebase.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
