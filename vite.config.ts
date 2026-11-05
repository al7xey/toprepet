import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build' && mode !== 'demo' && !env.VITE_API_URL && env.VITE_API_MODE !== 'demo') {
    throw new Error('Set VITE_API_URL for the service, or VITE_API_MODE=demo for an explicit demo build.');
  }
  return {
  base: '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  server: { host: '127.0.0.1' },
  build: {
    manifest: true,
    target: 'es2022',
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
            // Всё ниже нужно только админке блога и грузится лениво.
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'editor', test: /node_modules[\\/](@tiptap|prosemirror[^\\/]*|@floating-ui|linkifyjs|orderedmap|rope-sequence|w3c-keyname|markdown-it|entities)[\\/]/ },
            { name: 'transliteration', test: /node_modules[\\/]transliteration[\\/]/ },
          ],
        },
      },
    },
  },
  };
});
