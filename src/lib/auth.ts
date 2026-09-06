import { supabase } from './supabaseClient';

// The only account allowed to edit existing teacher profiles.
// Enforced for real by the "owner update teachers" RLS policy in Supabase —
// this constant only controls whether the UI *offers* the edit action.
export const ADMIN_EMAIL = 'usmanovs.seyitbek@gmail.com';

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
