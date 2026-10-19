import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('нижняя панель: нажатие открывает раздел и подсвечивает его', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/lessons');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await tabs.nth(2).click();
  await expect(page).toHaveURL(/\/me\/requests/);
  await expect(tabs.nth(2)).toHaveClass(/cur/);
  await expect(tabs.nth(1)).not.toHaveClass(/cur/);
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
