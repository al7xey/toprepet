import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// TopRepet marketplace app. Shares photos and fonts with the landing site through ../public.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  publicDir: fileURLToPath(new URL('../public', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@service': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5180 },
  preview: { host: '127.0.0.1', port: 5181 },
  build: {
    outDir: fileURLToPath(new URL('../dist-service', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
  },
});
