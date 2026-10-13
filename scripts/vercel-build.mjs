/* Vercel build entry. The landing site is built as usual; the branch `feature/new-service`
   (or any build with SERVICE_BUILD=1) publishes the service and the landing on one domain:
   the service owns /, /teachers/…, the sign-in pages and the cabinets; the landing keeps
   /for-repetitor/, /contact/, /legal/…, /blog/… (iteration 5, О3). Old addresses get a 301
   from service/redirects.json. */
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const run = command => execSync(command, { stdio: 'inherit' });
const service = process.env.SERVICE_BUILD === '1' || process.env.VERCEL_GIT_COMMIT_REF === 'feature/new-service';

if (!service) {
  run('pnpm build');
} else {
  run('pnpm build');
  /* The service shares the Supabase project of the blog. Both values are public (the blog ships them
     in its bundle), so when the Vercel variables are not set the build takes them from the blog config. */
  const blog = JSON.parse(readFileSync('src/blog/supabase-config.json', 'utf8'));
  process.env.VITE_SUPABASE_URL ||= blog.url;
  process.env.VITE_SUPABASE_ANON_KEY ||= blog.publishableKey;
  run('pnpm service:build');
  const out = '.vercel/output';
  const stat = `${out}/static`;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(stat, { recursive: true });

  /* The landing without the pages the service now owns. Its HTML marks the one-domain mode, so a
     client-side link from a landing page to / or /teachers/… reloads into the service (src/app/app.tsx). */
  cpSync('dist', stat, { recursive: true });
  rmSync(`${stat}/index.html`);
  rmSync(`${stat}/teachers`, { recursive: true, force: true });
  rmSync(`${stat}/teacher`, { recursive: true, force: true });
  for (const old of ['lessons', 'free-intro', 'for-tutors']) rmSync(`${stat}/${old}`, { recursive: true, force: true });
  const mark = dir => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'assets') mark(path);
      } else if (name.endsWith('.html')) {
        writeFileSync(path, readFileSync(path, 'utf8').replace(/<html(?![^>]*data-service)/, '<html data-service="on"'));
      }
    }
  };
  mark(stat);

  /* The service: hashed assets next to the landing's, its page as /index.html (shared public files are the same). */
  cpSync('dist-service/assets', `${stat}/assets`, { recursive: true });
  copyFileSync('dist-service/index.html', `${stat}/index.html`);

  /* The landing sitemap lists the 10 profiles at /teachers/<id>/; the service serves them under the same addresses. */
  if (!existsSync(`${stat}/sitemap.xml`)) throw new Error('no sitemap.xml from the landing build');

  const { redirects } = JSON.parse(readFileSync('service/redirects.json', 'utf8'));
  const routes = [
    ...redirects.map(r => ({ src: r.from, status: 301, headers: { Location: r.to } })),
    { handle: 'filesystem' },
    // landing pages are prerendered as <path>/index.html
    { src: '^/(.*[^/])/?$', dest: '/$1/index.html', check: true },
    { src: '^/(?:teachers|login|signup|reset|book|cabinet|tutor|admin)(?:/.*)?$', dest: '/index.html' },
    { src: '^/.*$', dest: '/404.html', status: 404 },
  ];
  writeFileSync(`${out}/config.json`, JSON.stringify({ version: 3, routes }, null, 2));
}
