import { defineConfig } from 'vitest/config';

// Сквозные проверки лежат в e2e/ и запускаются отдельно (pnpm e2e).
export default defineConfig({ test: { include: ['src/**/*.test.{ts,tsx}'] } });
