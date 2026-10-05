import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { parse } from 'parse5';
import { routes, canonicalForRoute } from './seo-routes.mjs';

function nodes(root, predicate) {
  const found = [];
  const visit = node => { if (predicate(node)) found.push(node); for (const child of node.childNodes || []) visit(child); };
  visit(root); return found;
}
const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value;
const legalRoutes = routes.filter(route => route.startsWith('/legal'));
assert.equal(legalRoutes.length, 10, 'Nine documents plus the directory');
for (const route of legalRoutes) {
  const html = await readFile(resolve(`dist${route}/index.html`), 'utf8');
  const tree = parse(html);
  assert.equal(nodes(tree, node => node.tagName === 'h1').length, 1, `${route}: h1`);
  assert.equal(nodes(tree, node => node.tagName === 'link' && attr(node, 'rel') === 'canonical')[0]?.attrs.find(a => a.name === 'href')?.value, canonicalForRoute(route));
  assert(!html.includes('Документ не найден'), `${route}: not found`);
  const ids = nodes(tree, node => attr(node, 'id')).map(node => attr(node, 'id'));
  assert.equal(ids.length, new Set(ids).size, `${route}: duplicate anchors`);
  for (const anchor of nodes(tree, node => node.tagName === 'a')) {
    const href = attr(anchor, 'href') || '';
    if (href.startsWith('#')) assert(ids.includes(href.slice(1)), `${route}: ${href}`);
    if (href.startsWith('/legal')) {
      const target = href.split('#')[0].replace(/\/$/, '');
      assert(legalRoutes.includes(target), `${route}: broken legal link ${href}`);
    }
  }
  for (const checkbox of nodes(tree, node => node.tagName === 'input' && attr(node, 'type') === 'checkbox')) {
    assert.equal(attr(checkbox, 'checked'), undefined, `${route}: prechecked consent`);
  }
  assert.equal(nodes(tree, node => node.tagName === 'script' && /mc\.yandex/.test(attr(node, 'src') || '')).length, 0, `${route}: eager analytics`);
  assert(!html.includes('mailto:TODO'), `${route}: fake email link`);
}
for (const route of ['/for-repetitor', '/teachers/informatics', '/teachers/english', '/teachers/russian', '/teachers/chemistry-biology', '/teachers/mathematics', '/teachers/russian-literature']) {
  const html = await readFile(resolve(`dist${route}/index.html`), 'utf8');
  assert(!html.includes('worksFor'), `${route}: employment schema`);
  assert(html.includes('/legal/tutor-terms/') || route.startsWith('/teachers/'), `${route}: tutor terms link`);
  if (route.startsWith('/teachers/')) assert(html.includes('независимый репетитор'), `${route}: tutor role`);
}
const home = await readFile('dist/index.html', 'utf8');
assert(home.includes('100% возврат оплаты, если оплаченное занятие не было проведено.'), 'Refund claim');
assert(!home.includes('Гарантируем полный возврат оплаты, если возникнет спорная ситуация'), 'Overbroad claim');
const login = parse(await readFile('dist/blog/admin/login/index.html', 'utf8'));
const loginCheckboxes = nodes(login, node => node.tagName === 'input' && attr(node, 'type') === 'checkbox');
assert.equal(loginCheckboxes.length, 1, 'Separate login consent');
assert.equal(attr(loginCheckboxes[0], 'checked'), undefined, 'Unchecked login consent');
assert(nodes(login, node => node.tagName === 'input' && attr(node, 'type') === 'password').length, 'Password masked');

// Exercise the actual consent/analytics modules against a production hostname,
// without a browser, network request or real visitor data.
const storage = new Map();
const scripts = [];
const events = [];
const context = {
  console, URL, Date, Event,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  location: { hostname: 'toprepet.ru', pathname: '/', href: 'https://toprepet.ru/' },
  window: { dispatchEvent: event => events.push(event.type) },
  document: {
    cookie: '', referrer: '',
    head: { append: script => scripts.push(script) },
    createElement: () => ({ dataset: {}, remove() { scripts.splice(scripts.indexOf(this), 1); } }),
    querySelector: selector => selector.includes('script') ? scripts[0] : null,
  },
};
const modules = new Map();
async function load(file) {
  const absolute = resolve(file);
  if (modules.has(absolute)) return modules.get(absolute);
  const source = await readFile(absolute, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies = new Map();
  if (file.endsWith('analytics.ts')) dependencies.set('./cookie-consent', await load('src/shared/lib/cookie-consent.ts'));
  const module = { exports: {} };
  runInNewContext(output, {
    ...context, module, exports: module.exports,
    require: name => dependencies.get(name) || (name.includes('entities/lesson') ? { subjects: [], foundationSubjects: [], goals: [], exams: [] } : name.includes('entities/teacher') ? { teachers: [] } : modules.get(resolve(dirname(absolute), `${name}.ts`))),
  }, { filename: file });
  modules.set(absolute, module.exports); return module.exports;
}
const consent = await load('src/shared/lib/cookie-consent.ts');
const analytics = await load('src/shared/lib/analytics.ts');
assert.equal(analytics.syncAnalytics(), false); assert.equal(scripts.length, 0);
consent.saveCookieChoice('necessary');
assert.equal(analytics.syncAnalytics(), false); assert.equal(scripts.length, 0);
consent.saveCookieChoice('all');
assert.equal(analytics.syncAnalytics(), true); assert.equal(scripts.length, 1);
assert(scripts[0].src.startsWith('https://mc.yandex.ru/metrika/tag.js'));
assert(context.window.ym.a.some(call => call[1] === 'init'));
consent.saveCookieChoice('necessary');
assert.equal(analytics.syncAnalytics(), false);
assert.equal(scripts.length, 0, 'Pending script removed on withdrawal');
assert.equal(context.window.ym, undefined, 'Pending vendor init discarded');
consent.saveCookieChoice('all');
context.location.pathname = '/blog/admin/login/';
assert.equal(analytics.syncAnalytics(), false); assert.equal(scripts.length, 0);
context.location.pathname = '/'; context.location.hostname = '127.0.0.1';
assert.equal(analytics.syncAnalytics(), false); assert.equal(scripts.length, 0);
context.location.hostname = 'toprepet.ru';
const calls = []; context.window.ym = (...args) => calls.push(args);
assert.equal(analytics.syncAnalytics(), true);
consent.saveCookieChoice('necessary');
assert.equal(analytics.syncAnalytics(), false);
const before = calls.length;
analytics.trackGoal('teacher_search');
assert.equal(calls.length, before, 'No goals after refusal');
assert(calls.some(call => call[1] === 'destruct'), 'Loaded counter destroyed');
assert.equal(analytics.analyticsUrl('https://toprepet.ru/teachers/?email=private&search=secret&utm_source=yandex'), 'https://toprepet.ru/teachers/?utm_source=yandex');
console.log(`Legal verification passed: ${legalRoutes.length} routes, anchors, footer links, initial checkboxes, refund claim and analytics consent lifecycle.`);
