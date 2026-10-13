import { expect, test } from '@playwright/test';

/* О3: the service preview answers with the same 301 as the one-domain Vercel build (service/redirects.json). */
for (const old of ['/lessons/', '/free-intro/']) {
  test(`О3 ${old} отвечает 301 на /teachers/`, async ({ page, request }) => {
    const res = await request.get(old, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe('/teachers/');

    await page.goto(old);
    await expect(page).toHaveURL(/\/teachers\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('О3 старый адрес анкеты /teacher/<id>/ ведёт на /teachers/<id>/', async ({ request }) => {
  const res = await request.get('/teacher/english/', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers().location).toBe('/teachers/english/');
});
