import pages from '../src/shared/config/seo-pages.json' with { type: 'json' };

export const routes = Object.keys(pages);
export const titles = Object.fromEntries(Object.entries(pages).map(([path, page]) => [path, page.title]));
export const descriptions = Object.fromEntries(Object.entries(pages).map(([path, page]) => [path, page.description]));
export const canonicalForRoute = route => route === '/' ? 'https://toprepet.ru/' : `https://toprepet.ru${route}/`;
