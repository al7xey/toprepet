/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/* E2E against the service build (`vite preview`, port 5181) and a local Supabase (`supabase start`).
   PW_CHROMIUM lets a machine with a preinstalled browser skip `playwright install`. */
const executablePath = process.env.PW_CHROMIUM || undefined;
const baseURL = 'http://127.0.0.1:5181';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: false, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'pnpm service:build && pnpm service:preview --strictPort',
    env: { VITE_E2E: '1' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
