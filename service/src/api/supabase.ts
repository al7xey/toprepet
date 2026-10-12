import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/* What the auth redirect put into the address before supabase-js reads and clears it.
   /reset/new/ uses it to tell a fresh recovery link from an expired or used one. */
function readAuthHash() {
  if (typeof window === 'undefined') return { type: '', error: '' };
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return { type: params.get('type') ?? '', error: params.get('error_code') || params.get('error') || '' };
}
export const authRedirect = readAuthHash();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set: data requests will fail.');
}

export const supabase = createClient(SUPABASE_URL || 'http://supabase.invalid', SUPABASE_ANON_KEY || 'missing', {
  auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});
