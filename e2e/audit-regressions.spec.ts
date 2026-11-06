import { expect, test } from '@playwright/test';
import { login, expectNoHorizontalScroll } from './helpers';

for (const width of [768, 1024]) for (const role of ['student', 'tutor', 'admin'] as const) {
  test(`меню ${role}: ${width}px без наложения`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, role);
    const header = page.locator('.trk-app-hdr');
    await expect(header).toBeVisible();
    const hits = await header.locator('nav a').evaluateAll((links) => links.map((link) => {
      const r = link.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a') === link;
    }));
    expect(hits.every(Boolean)).toBe(true);
    const boxes = await header.evaluate((h) => ['.logo', 'nav', '.icons'].map((selector) => {
      const r = h.querySelector(selector)!.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    }));
    const [logo, nav, icons] = boxes;
    for (const control of [logo, icons]) expect(nav.right <= control.left || nav.left >= control.right || nav.bottom <= control.top || nav.top >= control.bottom).toBe(true);
    await expectNoHorizontalScroll(page);
    if (role === 'tutor' && width === 768) await header.screenshot({ path: testInfo.outputPath('tablet-navigation.png') });
  });
}

test('удаление документа требует подтверждения и снимает отметку проверки', async ({ page }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/documents');
  const card = page.locator('.trk-card').filter({ hasText: 'Диплом бакалавра' });
  await card.getByRole('button', { name: 'Удалить документ' }).click();
  await page.getByRole('button', { name: 'Не сейчас' }).click();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Удалить документ' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto('/teachers/english');
  await expect(page.getByText('Документы проверены', { exact: true })).toHaveCount(0);
});
