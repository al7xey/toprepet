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

test('предупреждение о тестовой карте появляется в форме оплаты', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Демонстрационный режим')).toHaveCount(0);
  await login(page, 'student');
  await page.goto('/me/payments');
  await page.getByRole('tab', { name: 'Карты', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить карту', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Не вводите настоящие данные карты');
});

test('переписка загружается страницами, старая история доступна по кнопке', async ({ page }) => {
  await login(page, 'student');
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('toprepet-mock-v3')!);
    for (let i = 0; i < 220; i++) state.messages.push({
      id: 'history-' + String(i).padStart(4, '0'), conversationId: 'c-1',
      authorId: 'u-student', kind: 'text', text: 'История для проверки ' + i,
      at: new Date(Date.now() - (220 - i) * 1000).toISOString(), read: true,
    });
    localStorage.setItem('toprepet-mock-v3', JSON.stringify(state));
  });
  await page.goto('/me/chats/c-1');
  await expect(page.locator('.tg-msg')).toHaveCount(100);
  await page.getByRole('button', { name: 'Предыдущие сообщения' }).click();
  await expect(page.locator('.tg-msg')).toHaveCount(200);
  await page.getByRole('button', { name: 'Предыдущие сообщения' }).click();
  await expect(page.getByText('История для проверки 0', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Предыдущие сообщения' })).toHaveCount(0);
});
