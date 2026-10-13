/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_MAIL_API_URL?: string;
  readonly VITE_E2E?: string;
  /** Yandex Metrika counter id; analytics stay off without it */
  readonly VITE_YM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
