import { defineConfig } from '@playwright/test';

/**
 * Сквозные проверки на собранном сайте (`vite preview`) с мок-сервером в браузере.
 * Запуск: `pnpm build:e2e && pnpm e2e`. Два экрана: компьютер 1440 и телефон 390.
 * Один сценарий (`e2e/real-backend.spec.ts`) идёт против настоящего Django: нужен `E2E_API_URL`.
 */
const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`,
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
