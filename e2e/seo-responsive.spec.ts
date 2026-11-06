import { expect, test } from '@playwright/test';
import privatePages from '../src/shared/config/private-seo-pages.json' with { type: 'json' };
import { login } from './helpers';

test('title и noindex авторизации присутствуют ещё до JavaScript', async ({ request }) => {
  for (const route of ['/login', '/signup', '/reset-password', '/verify-email', '/auth/verify', '/me/payments', '/tutor/documents', '/admin/documents']) {
    const html = await (await request.get(`${route}/`)).text();
    expect(html).toContain(`<title>${privatePages[route as keyof typeof privatePages]} — TopRepet</title>`);
    expect(html).toContain('noindex,follow');
    expect(html).not.toContain('rel="canonical"');
  }
});

test('метаданные следуют за SPA-переходами и не остаются от прежней страницы', async ({ page }) => {
  await page.goto('/teachers?query=Анна');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://toprepet.ru/teachers/');
  await page.locator('a.tc').first().click();
  await expect(page).toHaveTitle(/Анна/);
  const profile = new URL(page.url()).pathname.replace(/\/+$/, '');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://toprepet.ru${profile}/`);
  await page.goto('/login?next=%2Fme%2Fpayments');
  await expect(page).toHaveTitle('Вход в аккаунт — TopRepet');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
  await expect(page.locator('script[data-client-page-schema],script[data-prerender-schema]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Помощь', exact: true }).first().click();
  await expect(page).toHaveTitle(/Помощь/);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /index,follow,max-image/);
  const faq = await page.locator('script[type="application/ld+json"]').evaluateAll((tags) => tags.map((tag) => JSON.parse(tag.textContent || '{}')).find((schema) => schema['@type'] === 'FAQPage'));
  expect(faq.mainEntity.length).toBeGreaterThan(3);
  for (const question of faq.mainEntity) {
    await expect(page.getByText(question.name, { exact: true })).toBeVisible();
    expect(await page.locator('main').textContent()).toContain(question.acceptedAnswer.text);
  }
});

test('кабинет имеет заголовок, а недоступная анкета закрыта от индексации', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/account/settings');
  await expect(page).toHaveTitle('Настройки ученика — TopRepet');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,follow');
  await page.goto('/teachers/seo-missing-tutor');
  await expect(page.getByRole('heading', { name: 'Анкета не найдена' })).toBeVisible();
  await expect(page).toHaveTitle('Анкета не найдена — TopRepet');
  await expect(page.locator('link[rel=canonical]')).toHaveCount(0);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex,follow');
});

