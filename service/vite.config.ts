import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { devOutbox } from './dev-outbox';

// TopRepet marketplace app. Shares photos and fonts with the landing site through ../public.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_');
  const api = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
  return {
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: '/',
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
    // /__dev/outbox for /dev/mail exists only in the dev and preview servers (never on Vercel)
    plugins: [react(), devOutbox({ api })],
    resolve: { alias: { '@service': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { host: '127.0.0.1', port: 5180 },
    preview: { host: '127.0.0.1', port: 5181 },
    build: {
      outDir: fileURLToPath(new URL('../dist-service', import.meta.url)),
      emptyOutDir: true,
      target: 'es2022',
    },
  };
});
