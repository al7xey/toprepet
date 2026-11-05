import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('модальное окно удерживает Tab, блокирует фон и возвращает фокус', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/payments');
  await page.getByRole('tab', { name: 'Карты', exact: true }).click();
  const opener = page.getByRole('button', { name: /Добавить.*оплат|Добавить.*карт/ }).first();
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert', '');
  const nodes = dialog.locator('button:visible,input:visible,textarea:visible,select:visible,a[href]:visible');
  // Browser enforces the actual tab sequence, including reverse wrap.
  const last = nodes.last();
  await last.focus();
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#root')).not.toHaveAttribute('inert', '');
  await expect(opener).toBeFocused();
});

test('демонстрационный режим предупреждает о фиктивных оплатах', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Демонстрационный режим')).toContainText('Не вводите настоящие данные карты');
});
