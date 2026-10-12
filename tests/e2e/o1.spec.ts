import { expect, test } from '@playwright/test';

test.describe('О1 несуществующий адрес', () => {
  test('О1 неизвестный адрес показывает «Такой страницы нет» с кнопкой в каталог', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-12T12:00:00+03:00'));
    await page.goto('/takoy-stranicy-net/');
    await expect(page.getByRole('heading', { name: 'Такой страницы нет' })).toBeVisible();
    await expect(page).toHaveTitle(/Страница не найдена/);
    await page.getByRole('link', { name: 'К репетиторам' }).click();
    await expect(page).toHaveURL(/\/teachers\/$/);
  });

  test('О1 адрес без завершающей косой черты ведёт на адрес с ней', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login\/$/);
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
  });
});
