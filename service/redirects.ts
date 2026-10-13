import { readFileSync } from 'node:fs';
import type { Connect, Plugin } from 'vite';

/* О3: the same 301 redirects as the one-domain Vercel build (service/redirects.json), in the dev and preview servers,
   so e2e can check them. */
export interface Redirect {
  from: string;
  to: string;
}

export function loadRedirects(file = new URL('./redirects.json', import.meta.url)): Redirect[] {
  return (JSON.parse(readFileSync(file, 'utf8')) as { redirects: Redirect[] }).redirects;
}

/** The address an old path moves to, or null. */
export function redirectFor(pathname: string, list: Redirect[]): string | null {
  for (const r of list) {
    const m = new RegExp(r.from).exec(pathname);
    if (m) return r.to.replace(/\$(\d)/g, (_, i: string) => m[Number(i)] ?? '');
  }
  return null;
}

export function redirects(): Plugin {
  const list = loadRedirects();
  const handle: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://local');
    const to = redirectFor(url.pathname, list);
    if (!to) return next();
    res.statusCode = 301;
    res.setHeader('location', to);
    res.end();
  };
  return {
    name: 'toprepet-redirects',
    configureServer: server => void server.middlewares.use(handle),
    configurePreviewServer: server => void server.middlewares.use(handle),
  };
}
