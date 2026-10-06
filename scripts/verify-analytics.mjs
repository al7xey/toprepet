import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalNow = Date.now;
try {
  const analytics = await server.ssrLoadModule('/src/shared/lib/analytics.ts');
  const consent = await server.ssrLoadModule('/src/shared/lib/cookie-consent.ts');
  const storage = new Map();
  const scripts = [];
  const removedCookies = [];
  const calls = [];
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.window = { dispatchEvent() {} };
  globalThis.location = new URL('https://toprepet.ru/');
  globalThis.document = {
    referrer: 'https://example.com/?email=private@example.com', title: 'TopRepet',
    head: { append: script => scripts.push(script) },
    createElement: () => ({ dataset: {}, remove() { this.removed = true; } }),
    querySelector: selector => selector === 'h1' ? { textContent: 'Топ репет' } : scripts.findLast(script => !script.removed) ?? null,
    get cookie() { return '_ym_uid=123; necessary=yes'; },
    set cookie(value) { removedCookies.push(value); },
  };
  assert.equal(analytics.syncAnalytics(), false);
  analytics.trackPage();
  analytics.trackMessenger('telegram');
  assert.equal(scripts.length, 0, 'No script before consent');
  consent.saveCookieChoice('necessary');
  assert.equal(analytics.syncAnalytics(), false);
  assert.equal(scripts.length, 0, 'No script with necessary-only choice');
  assert.ok(removedCookies.every(cookie => cookie.startsWith('_ym_')));
  consent.saveCookieChoice('all');
  analytics.trackPage();
  analytics.trackPage();
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://mc.yandex.ru/metrika/tag.js?id=112922088');
  const pending = window.ym.a;
  assert.equal(pending.filter(call => call[1] === 'init').length, 1);
  assert.equal(pending.filter(call => call[1] === 'hit').length, 1, 'One hit per route');
  assert.equal(pending[0][2].defer, true);
  assert.equal(pending[0][2].webvisor, true);
  assert.equal(pending[1][3].referer, 'https://example.com/');
  consent.saveCookieChoice('necessary');
  assert.equal(analytics.syncAnalytics(), false);
  assert.equal(pending.length, 0, 'Withdrawal cancels pending vendor events');
  assert.equal(scripts[0].removed, true);
  assert.equal(window.ym, undefined);
  consent.saveCookieChoice('all');
  analytics.trackPage();
  assert.equal(scripts.length, 2);
  window.ym = (...args) => calls.push(args); // Mock the loaded API; no network telemetry.
  globalThis.location = new URL('https://toprepet.ru/teachers/informatics/');
  analytics.trackPage();
  analytics.trackMessenger('telegram');
  assert.ok(calls.some(call => call[2] === 'teacher_profile_view' && call[3].teacher === 'informatics'));
  assert.ok(calls.some(call => call[2] === 'contact_student_click'));
  assert.ok(calls.some(call => call[2] === 'contact_telegram'));
  const hits = calls.filter(call => call[1] === 'hit').length;
  analytics.trackPage();
  assert.equal(calls.filter(call => call[1] === 'hit').length, hits);
  globalThis.location = new URL('https://toprepet.ru/blog/admin/');
  assert.equal(analytics.syncAnalytics(), false);
  assert.equal(calls.at(-1)[1], 'destruct');
  const count = calls.length;
  analytics.trackGoal('blog_article_view');
  assert.equal(calls.length, count, 'Admin events excluded');
  globalThis.location = new URL('http://127.0.0.1:5173/');
  assert.equal(analytics.syncAnalytics(), false, 'Local development excluded');
  globalThis.location = new URL('https://toprepet.ru/for-repetitor/');
  analytics.trackPage();
  analytics.trackMessenger('vk');
  assert.ok(calls.some(call => call[2] === 'contact_tutor_click'));
  consent.saveCookieChoice('necessary');
  analytics.syncAnalytics();
  const stopped = calls.length;
  analytics.trackGoal('section_view');
  assert.equal(calls.length, stopped, 'No events after withdrawal');
  assert.equal(analytics.safeChoice('alex@example.com'), 'other');
  assert.equal(analytics.safeChoice('Информатика'), 'Информатика');
  assert.equal(analytics.analyticsUrl('https://toprepet.ru/?utm_source=yandex&email=private@example.com&phone=79991234567#private'), 'https://toprepet.ru/?utm_source=yandex');
  consent.saveCookieChoice('all');
  const saved = originalNow();
  Date.now = () => saved + 181 * 24 * 60 * 60 * 1000;
  assert.equal(consent.cookieChoice(), null, 'Stored/session permission expires');
  Date.now = originalNow;
  globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  consent.saveCookieChoice('all');
  assert.equal(consent.cookieChoice(), 'all');
  Date.now = () => originalNow() + 181 * 24 * 60 * 60 * 1000;
  assert.equal(consent.cookieChoice(), null, 'Volatile permission expires');
  const app = await readFile('src/app/app.tsx', 'utf8');
  assert.ok(app.includes('<MetrikaTracker />'));
  console.log('Metrika verified: consent, SPA hits, goals, privacy, withdrawal, exclusions and expiry.');
} finally {
  Date.now = originalNow;
  for (const key of ['window', 'location', 'document', 'localStorage']) delete globalThis[key];
  await server.close();
}
