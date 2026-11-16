import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('на 320px имя репетитора с рейтингом помещается в одну строку', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/teachers');
  const card = page.locator('a.tc').filter({ hasText: 'Анастасия' }).first();
  await expect(card).toBeVisible();
  const fits = await card.locator('.trh-tutor-name').evaluate(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getClientRects().length === 1 && node.scrollWidth <= node.clientWidth;
  });
  expect(fits).toBe(true);
});

test('мобильная форма не фокусирует поле при открытии и не закрывается от движения по инпуту', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'жест шторки только на телефоне');
  await login(page, 'student');
  await page.goto('/me/payments');
  await page.getByRole('tab', { name: 'Карты', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить карту', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeFocused();
  await dialog.locator('input').first().evaluate(input => {
    const touch = (y: number) => new Touch({ identifier: 1, target: input, clientX: 30, clientY: y });
    input.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(100)] }));
    input.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [touch(300)] }));
    input.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] }));
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('transform', 'none');
});
