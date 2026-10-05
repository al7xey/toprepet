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
  if ((html.match(/<meta name="robots"/g) || []).length !== 1 || !html.includes('max-image-preview:large')) fail(`${route}: robots/image preview`);
  if (route === '/teachers' && (!html.includes('"@type": "CollectionPage"') || !html.includes('"@type": "ItemList"'))) fail(`${route}: directory schema`);
  if (['/teachers', '/for-repetitor'].includes(route) && !html.includes('"@type": "BreadcrumbList"')) fail(`${route}: breadcrumb schema`);
  for (const [key, value] of [['og:title', title], ['og:description', description], ['og:url', canonical]]) {
    if (!html.includes(`property="${key}" content="${value}"`)) fail(`${route}: ${key}`);
  }
  seenTitles.add(title);
  seenDescriptions.add(description);
}

const sitemap = await readFile(resolve('dist/sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const blogSitemap = await readFile(resolve('dist/blog/sitemap.xml'), 'utf8');
const blogUrls = [...blogSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const expected = [...routes.map(canonicalForRoute), ...blogUrls];
if (urls.length !== expected.length || urls.some((url, index) => url !== expected[index])) fail('sitemap');
if (new Set(urls).size !== urls.length || !blogUrls.includes('https://toprepet.ru/blog/')) fail('sitemap duplicate/blog');
if (urls.some(url => url.includes('/teacher/'))) fail('sitemap legacy teacher URL');
for (const route of routes.filter(path => path.startsWith('/teachers/'))) {
  const oldRoute = route.replace('/teachers/', '/teacher/');
  const legacy = await readFile(resolve(`dist${oldRoute}/index.html`), 'utf8');
  const canonical = canonicalForRoute(route);
  if (!legacy.includes('noindex,follow') || !legacy.includes(`content="0;url=${canonical}"`) || !legacy.includes(`rel="canonical" href="${canonical}"`)) fail(`${oldRoute}: legacy redirect`);
}
const robots = await readFile(resolve('dist/robots.txt'), 'utf8');
if (!robots.includes('User-agent: OAI-SearchBot') || !robots.includes('Sitemap: https://toprepet.ru/sitemap.xml')) fail('robots');
const notFound = await readFile(resolve('dist/404.html'), 'utf8');
if (!notFound.includes('noindex,follow') || !notFound.includes('Страница не найдена') || notFound.includes('rel="canonical"')) fail('404');
console.log(`SEO проверка пройдена: ${routes.length} страниц и 404.html`);

for (const url of blogUrls) {
  const path = new URL(url).pathname;
  const html = await readFile(resolve(`dist${path}index.html`), 'utf8');
  if (!html.includes(`rel="canonical" href="${url}"`) || /name="robots" content="[^"]*noindex/.test(html)) fail(`${path}: blog canonical/robots`);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) fail(`${path}: blog heading`);
  if ((html.match(/<meta name="robots"/g) || []).length !== 1 || !html.includes('max-image-preview:large')) fail(`${path}: blog robots/image preview`);
}
for (const route of ['/blog/admin', '/blog/admin/login', '/blog/admin/articles', '/blog/admin/categories']) {
  const html = await readFile(resolve(`dist${route}/index.html`), 'utf8');
  if (!html.includes('noindex,follow') || urls.some(url=>url.includes('/blog/admin'))) fail(`${route}: admin indexed`);
}
if (!robots.includes('Clean-param:') || /Disallow:\s*\/(?:\s|$)/m.test(robots)) fail('robots clean-param/public access');
for (const route of ['/contact', '/free-intro']) {
  const html = await readFile(resolve(`dist${route}/index.html`), 'utf8');
  if (!html.includes('service-details') || !html.includes('/teachers/')) fail(`${route}: helpful content/links`);
}
const lessons = await readFile(resolve('dist/lessons/index.html'), 'utf8');
if (!lessons.includes('lesson-layout') || !lessons.includes('/teachers/')) fail('/lessons: picker/catalog navigation');
if (lessons.includes('Как подобрать репетитора под вашу задачу')) fail('/lessons: removed explanation returned');
