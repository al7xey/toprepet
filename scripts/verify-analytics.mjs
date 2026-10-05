import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const analytics = await server.ssrLoadModule('/src/shared/lib/analytics.ts');
  const calls = [];
  globalThis.window = { ym: (...args) => calls.push(args) };
  globalThis.location = new URL('https://toprepet.ru/');
  globalThis.document = { createElement: () => { throw new Error('Tracker script must not be created'); } };
  analytics.trackGoal('teachers_catalog_view');
  analytics.trackMessenger('telegram');
  assert.equal(calls.length, 0, 'Paused analytics must not send events');
  assert.equal(analytics.safeChoice('alex@example.com'), 'other');
  assert.equal(analytics.safeChoice('Информатика'), 'Информатика');
  const source = await readFile('src/shared/lib/analytics.ts', 'utf8');
  assert.ok(!source.includes('mc.yandex') && !source.includes('createElement'));
  const app = await readFile('src/app/app.tsx', 'utf8');
  assert.ok(!app.includes('CookieBanner') && !app.includes('MetrikaTracker'));
  console.log('Analytics pause verified: no tracker loader, events or cookie banner.');
} finally {
  delete globalThis.window; delete globalThis.location; delete globalThis.document;
  await server.close();
}
