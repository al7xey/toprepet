import { expect, test } from '@playwright/test';
import { login, expectNoHorizontalScroll } from './helpers';

test('основное и белое действие используют одну геометрию', async ({ page }) => {
  await page.goto('/');
  const buttons = page.locator('.trh-hero-btns .btn');
  await expect(buttons).toHaveCount(2);
  const sizes = await buttons.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect(); const style = getComputedStyle(element);
    return { height: box.height, font: style.fontSize, line: style.lineHeight, top: style.paddingTop, bottom: style.paddingBottom };
  }));
  expect(sizes[0]).toEqual(sizes[1]);
  expect(sizes[0].height).toBeGreaterThanOrEqual(56);
  expect(sizes[0].font).toBe('16px');
  expect(sizes[0].top).toBe(sizes[0].bottom);
});

test('увеличенный текст сохраняет содержание и доступность основных действий', async ({ page }) => {
  await page.goto('/login');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await expect(page.getByRole('heading', { name: 'Вход', exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const submit = page.getByRole('button', { name: 'Войти', exact: true });
  expect(await submit.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await page.getByLabel('Почта', { exact: true }).fill('olga@mail.ru');
  await page.getByLabel('Пароль', { exact: true }).fill('demo');
  await submit.click();
  await expect(page).not.toHaveURL(/\/login/);
});

test('поля личных данных и заголовок не выходят за экран с длинной почтой', async ({ page }) => {
  await login(page, 'student');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/me/account/settings?section=data');
  await expect(page.getByLabel('Имя', { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);
  const fields = await page.locator('main .trk-input-box').evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.x >= 0 && bounds.right <= innerWidth;
  }));
  expect(fields.every(Boolean)).toBe(true);
});
