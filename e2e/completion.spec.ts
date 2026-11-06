import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login, expectNoHorizontalScroll } from './helpers';
for (const [role, path, title] of [['student', '/me/tutors', 'Мои репетиторы'], ['tutor', '/tutor/documents', 'Документы'], ['admin', '/admin/documents', 'Проверка документов']] as const) {
  test(`${role}: ${title}`, async ({ page }, testInfo) => {
    await login(page, role);
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('.trk-card').first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    const accessibility = await new AxeBuilder({ page }).exclude('.hdr nav a.cur').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('page.png'), fullPage: true });
  });
}

test('длинное название документа не ломает карточку', async ({ page }) => {
  await login(page, 'tutor');
  await page.evaluate(() => {
    const key = 'toprepet-mock-v3';
    const state = JSON.parse(localStorage.getItem(key)!);
    state.documents.english[0].title = 'A'.repeat(200);
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto('/tutor/documents');
  await expect(page.getByText('A'.repeat(200), { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
