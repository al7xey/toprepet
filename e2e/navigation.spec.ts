import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('нижняя панель ученика: Поиск, Занятия, Чаты, Профиль; заявки живут в профиле', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/account');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(1)).toContainText('Занятия');
  await tabs.nth(1).click();
  await expect(page).toHaveURL(/\/me\/lessons/);
  await expect(tabs.nth(1)).toHaveClass(/cur/);
  // заявки, платежи и уведомления подсвечивают «Профиль»
  await page.goto('/me/requests');
  await expect(tabs.nth(3)).toHaveClass(/cur/);
});

test('нижняя панель: пилюлю можно тянуть, открывается пункт, над которым отпустили палец', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/chats');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  const from = await tabs.nth(2).boundingBox();
  const to = await tabs.nth(3).boundingBox();
  if (!from || !to) throw new Error('нет размеров пунктов панели');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, from.y + from.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/me\/account/);
});

test('репетитор: в нижней панели есть «Профиль», а раздела «Доход» там нет', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'tutor');
  await page.goto('/tutor/lessons');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await expect(tabs.last()).toHaveText('Профиль');
  await tabs.last().click();
  await expect(page).toHaveURL(/\/tutor\/account/);
  await expect(page.locator('nav.trk-tabbar a.tab', { hasText: 'Доход' })).toHaveCount(0);
});

test('репетитор выходит из аккаунта через настройки профиля', async ({ page }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/account');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).not.toHaveURL(/\/tutor\/account/);
  await page.goto('/tutor/account');
  await expect(page).toHaveURL(/\/login/);
});
