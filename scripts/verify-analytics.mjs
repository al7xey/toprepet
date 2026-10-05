import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const analytics = await server.ssrLoadModule('/src/shared/lib/analytics.ts');
  assert.equal(analytics.isPublicAnalyticsPage('127.0.0.1', '/'), false);
  assert.equal(analytics.isPublicAnalyticsPage('toprepet.ru', '/blog/admin/login/'), false);
  assert.equal(analytics.isPublicAnalyticsPage('toprepet.ru', '/blog/'), true);
  assert.equal(analytics.safeChoice('alex@example.com'), 'other');
  assert.equal(analytics.safeChoice('Информатика'), 'Информатика');
  assert.equal(analytics.analyticsUrl('https://toprepet.ru/lessons/?email=alex@example.com&text=secret&subject=private&utm_source=yandex&yclid=1234567890#contact'),
    'https://toprepet.ru/lessons/?utm_source=yandex&yclid=1234567890');
  const calls = [];
  globalThis.location = new URL('https://toprepet.ru/blog/');
  globalThis.window = { ym: (...args) => calls.push(args) };
  globalThis.document = { referrer: '', title: 'TopRepet', querySelector: () => ({ textContent: 'Блог' }) };
  analytics.trackPage();
  analytics.trackPage();
  assert.equal(calls.filter(([, method]) => method === 'hit').length, 1, 'StrictMode must not double page views');
  assert.equal(calls[0][1], 'init');
  globalThis.location = new URL('https://toprepet.ru/teachers/english/');
  analytics.trackPage();
  analytics.trackMessenger('telegram');
  assert.ok(calls.some(([, method, goal, params]) => method === 'reachGoal' && goal === 'teacher_profile_view' && params.teacher === 'english'));
  assert.ok(calls.some(([, method, goal]) => method === 'reachGoal' && goal === 'contact_student_click'));
  globalThis.location = new URL('https://toprepet.ru/blog/admin/');
  analytics.syncAnalytics();
  assert.equal(calls.at(-1)[1], 'destruct');
  const count = calls.length;
  analytics.trackPage();
  analytics.trackMessenger('telegram');
  assert.equal(calls.length, count, 'Admin screens must not send analytics');
  globalThis.location = new URL('https://toprepet.ru/for-repetitor/');
  analytics.trackPage();
  analytics.trackMessenger('vk');
  assert.ok(calls.some(([, method, goal]) => method === 'reachGoal' && goal === 'contact_tutor_click'));
  globalThis.location = new URL('http://127.0.0.1:5173/');
  analytics.syncAnalytics();
  const localCount = calls.length;
  analytics.trackPage();
  assert.equal(calls.length, localCount, 'Local previews must not pollute production data');
  console.log('Analytics verified: public blog, route deduplication, attribution, goals, local/admin exclusion and input privacy.');
} finally {
  delete globalThis.window; delete globalThis.document; delete globalThis.location;
  await server.close();
}
