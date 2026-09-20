import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  server: { host: '127.0.0.1' },
  build: {
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
            {
              name: 'state',
              test: /node_modules[\\/](@reduxjs|react-redux|redux|immer|reselect)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
