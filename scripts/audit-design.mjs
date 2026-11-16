import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:5180';
const output = process.env.AUDIT_OUTPUT || 'design/review-2026-11-16';
await mkdir(output, { recursive: true });
const routes = {
  guest: ['/', '/teachers', '/teachers/english', '/for-repetitor', '/help', '/blog', '/legal', '/legal/terms', '/legal/payment-refund', '/legal/tutor-terms', '/legal/cookies', '/login', '/signup', '/reset-password', '/verify-email', '/onboarding', '/missing'],
  student: ['/me/account', '/me/account/settings', '/me/account/settings?section=data', '/me/tutors', '/book/english', '/me/lessons', '/me/lessons/l-4', '/me/lessons/l-4/review', '/me/lessons/l-4/problem', '/me/payments', '/me/notifications', '/me/requests', '/me/requests/new', '/me/requests/r-1', '/requests', '/me/chats', '/me/chats/c-1'],
  tutor: ['/tutor/account', '/tutor/account/settings', '/tutor/profile', '/tutor/profile/edit', '/tutor/documents', '/tutor/lessons', '/tutor/lessons/l-2', '/tutor/schedule', '/tutor/finance', '/tutor/students', '/tutor/reviews', '/tutor/requests', '/tutor/chats', '/tutor/chats/c-1', '/tutor/notifications'],
  admin: ['/admin/documents', '/admin/profiles', '/admin/reviews', '/admin/disputes', '/admin/cancellations'],
};
const accounts = { student: 'olga@mail.ru', tutor: 'anastasia@toprepet.ru', admin: 'admin@toprepet.ru' };
const browser = await chromium.launch({ headless: true });
const results = [];
for (const width of [390, 1440]) {
  for (const [role, paths] of Object.entries(routes)) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (role !== 'guest') {
      await page.goto(`${base}/login`);
      await page.locator('input[type=email]').fill(accounts[role]);
      await page.locator('input[type=password]').fill('demo');
      await page.locator('button[type=submit]').click();
      await page.waitForURL((url) => !url.pathname.includes('/login'));
    }
    for (const route of paths) {
      const start = errors.length;
      await page.goto(`${base}${route}`);
      await page.waitForLoadState('networkidle');
      await page.locator('main').waitFor();
      await page.waitForFunction(() => ![...document.querySelectorAll('main .skel')].some((node) => node.getClientRects().length), undefined, { timeout: 8000 }).catch(() => undefined);
      await page.evaluate(async () => {
        const images = [...document.querySelectorAll('main img')];
        images.forEach((image) => { image.loading = 'eager'; });
        await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      });
      const metrics = await page.evaluate(() => {
        const visible = (element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
        const buttons = [...document.querySelectorAll('main .btn')].filter(visible).map((element) => {
          const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
          return { text: element.textContent.trim(), height: Math.round(rect.height), font: style.fontSize, line: style.lineHeight };
        });
        return {
          heading: document.querySelector('main h1')?.textContent,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          brokenImages: [...document.querySelectorAll('main img')].filter(visible).filter((img) => img.complete && !img.naturalWidth).map((img) => img.src),
          buttons,
        };
      });
      const file = `${width}-${role}-${route.replace(/[^a-z0-9]+/gi, '-') || 'home'}.png`;
      await page.screenshot({ path: `${output}/${file}`, fullPage: true });
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      const violations = scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }));
      const result = { width, role, route, actual: new URL(page.url()).pathname, ...metrics, violations, errors: errors.slice(start), screenshot: file };
      results.push(result);
      console.log(JSON.stringify({ width, role, route, overflow: metrics.overflow, violations: violations.map((v) => v.id), errors: result.errors }));
    }
    if (role === 'student' || role === 'tutor') {
      const chat = await page.locator('a.tg-row').first().getAttribute('href').catch(() => null);
      if (chat) console.log(`chat route available: ${chat}`);
    }
    await context.close();
  }
}
await browser.close();
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(`Saved ${results.length} route reviews to ${output}`);
