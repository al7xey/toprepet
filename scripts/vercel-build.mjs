/* Vercel build entry. The landing site is built as usual; the branch `feature/new-service`
   (or any build with SERVICE_BUILD=1) publishes the marketplace app from service/ instead,
   so the branch preview on Vercel opens the new service. */
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const run = command => execSync(command, { stdio: 'inherit' });
const service = process.env.SERVICE_BUILD === '1' || process.env.VERCEL_GIT_COMMIT_REF === 'feature/new-service';

if (!service) {
  run('pnpm build');
} else {
  run('pnpm service:build');
  /* Build Output API: static files plus a fallback to index.html for client-side routes */
  rmSync('.vercel/output', { recursive: true, force: true });
  mkdirSync('.vercel/output', { recursive: true });
  cpSync('dist-service', '.vercel/output/static', { recursive: true });
  writeFileSync('.vercel/output/config.json', JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/index.html' }] }));
}
