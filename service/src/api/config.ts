/* Build-time settings. Local `supabase start` defaults are used only in development and e2e builds. */

export const DEV_TOOLS = import.meta.env.DEV || Boolean(import.meta.env.VITE_E2E);

const LOCAL_URL = 'http://127.0.0.1:54321';
// The well-known anon key of `supabase start`; it only works against a local stack.
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || (DEV_TOOLS ? LOCAL_URL : '');
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || (DEV_TOOLS ? LOCAL_ANON_KEY : '');
export const MAIL_API_URL = import.meta.env.VITE_MAIL_API_URL || 'http://127.0.0.1:54324';

export const SUPPORT_TELEGRAM = '@toprepet_manager';
export const SUPPORT_URL = 'https://t.me/toprepet_manager';
export const BLOG_URL = 'https://toprepet.ru/blog/';
