import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routes, titles, descriptions, canonicalForRoute } from './seo-routes.mjs';

const fail = message => { throw new Error(`SEO: ${message}`); };
const seenTitles = new Set();
const seenDescriptions = new Set();

for (const route of routes) {
  const file = route === '/' ? 'dist/index.html' : `dist${route}/index.html`;
  const html = await readFile(resolve(file), 'utf8');
  const canonical = canonicalForRoute(route);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"\s*\/>/)?.[1];
  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"\s*\/>/g)];
  if (title !== titles[route] || !title || seenTitles.has(title)) fail(`${route}: title`);
  if (description !== descriptions[route] || !description || seenDescriptions.has(description)) fail(`${route}: description`);
  if (canonicals.length !== 1 || canonicals[0][1] !== canonical) fail(`${route}: canonical`);
  if (!/<h1(?:\s|>)/i.test(html) || !/<div id="root">[\s\S]{300,}<\/div>/.test(html)) fail(`${route}: prerender`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) fail(`${route}: noindex`);
  for (const key of ['og:title', 'og:description', 'og:url']) {
    if (!html.includes(`property="${key}"`)) fail(`${route}: ${key}`);
  }
  seenTitles.add(title);
  seenDescriptions.add(description);
}

const sitemap = await readFile(resolve('dist/sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const expected = routes.map(canonicalForRoute);
if (urls.length !== expected.length || urls.some((url, index) => url !== expected[index])) fail('sitemap');
const notFound = await readFile(resolve('dist/404.html'), 'utf8');
if (!notFound.includes('noindex,follow') || !notFound.includes('Страница не найдена') || notFound.includes('rel="canonical"')) fail('404');
console.log(`SEO проверка пройдена: ${routes.length} страниц и 404.html`);
