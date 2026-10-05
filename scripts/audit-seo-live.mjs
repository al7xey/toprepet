import { parse } from 'parse5';
import { writeFile, mkdir } from 'node:fs/promises';

const origin = process.argv[2] || 'https://toprepet.ru';
const get = async path => {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
  return { status: response.status, url: response.url, headers: Object.fromEntries(response.headers), html: await response.text() };
};
const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const content = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(content).join(' ');
const sitemap = await get('/sitemap.xml');
const urls = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(item => new URL(item[1]).pathname);
const records = await Promise.all(urls.map(async path => {
  const page = await get(path);
  const nodes = walk(parse(page.html));
  const tag = name => nodes.filter(node => node.tagName === name);
  const meta = name => attr(tag('meta').find(node => attr(node, 'name') === name || attr(node, 'property') === name) || {}, 'content');
  const schemas = tag('script').filter(node => attr(node, 'type') === 'application/ld+json').map(node => { try { return JSON.parse(content(node)); } catch { return { invalid: true }; } });
  return { path, status: page.status, url: page.url, title: tag('title').map(content), description: meta('description'), canonical: tag('link').filter(node => attr(node, 'rel') === 'canonical').map(node => attr(node, 'href')), robots: meta('robots'), xRobots: page.headers['x-robots-tag'], h1: tag('h1').map(content), textLength: content(tag('main')[0] || {}).trim().length, schemas, links: tag('a').map(node => attr(node, 'href')).filter(Boolean), images: tag('img').map(node => ({src:attr(node,'src'),alt:attr(node,'alt')})) };
}));
const probes = await Promise.all(['/robots.txt','/blog/admin/','/teacher/english/','/seo-audit-missing-page/'].map(async path => { const page=await get(path); return {path,status:page.status,robots:page.html.match(/name="robots" content="([^"]+)"/)?.[1], redirect:page.html.match(/http-equiv="refresh" content="([^"]+)"/)?.[1]}; }));
const problems = records.flatMap(page => [page.status !== 200 && `${page.path}: HTTP ${page.status}`, page.h1.length !== 1 && `${page.path}: ${page.h1.length} h1`, page.canonical[0] !== new URL(page.path,origin).href && `${page.path}: canonical`, !page.description && `${page.path}: description`, /noindex/i.test(`${page.robots} ${page.xRobots}`) && `${page.path}: noindex`, page.schemas.some(schema=>schema.invalid) && `${page.path}: invalid JSON-LD`].filter(Boolean));
await mkdir('outputs', {recursive:true});
await writeFile('outputs/seo-live-audit.json', JSON.stringify({origin,sitemapStatus:sitemap.status,records,probes,problems},null,2));
console.table(records.map(({path,status,title,textLength,h1})=>({path,status,title:title[0],textLength,h1:h1.length})));
console.log(JSON.stringify({pages:records.length,sitemapStatus:sitemap.status,probes,problems},null,2));
if(problems.length) process.exitCode=1;
