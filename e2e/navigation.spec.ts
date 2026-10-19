import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('нижняя панель: нажатие открывает раздел и подсвечивает его', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/account');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await expect(tabs).toHaveCount(3);
  await tabs.nth(1).click();
  await expect(page).toHaveURL(/\/me\/chats/);
  await expect(tabs.nth(1)).toHaveClass(/cur/);
  // «Мои уроки» и «Мои заявки» живут в профиле: вкладка «Профиль» остаётся выбранной
  await page.goto('/me/lessons');
  await expect(tabs.nth(2)).toHaveClass(/cur/);
});

test('нижняя панель: пилюлю можно тянуть, открывается пункт, над которым отпустили палец', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/chats');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  const from = await tabs.nth(1).boundingBox();
  const to = await tabs.nth(2).boundingBox();
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

test('репетитор выходит из аккаунта со страницы «Анкета»', async ({ page }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/profile');
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).not.toHaveURL(/\/tutor\/profile/);
  await page.goto('/tutor/profile');
  await expect(page).toHaveURL(/\/login/);
});
