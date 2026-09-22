import { createClient } from '@supabase/supabase-js';

// Vite inlines import.meta.env in the browser bundle; under tsx (the prerender
// script) it is undefined, so fall back to process.env instead of throwing at
// import time. The client is never used for queries during prerender.
const env = ((import.meta as unknown as { env?: Record<string, string> }).env ?? {}) as Record<string, string | undefined>;
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env?.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost';
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
