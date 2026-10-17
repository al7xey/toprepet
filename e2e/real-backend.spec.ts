import { expect, test } from '@playwright/test';
import { login } from './helpers';

/**
 * Сквозной сценарий против настоящего Django: сайт собран с VITE_API_URL, база с демо-данными.
 * Запускается скриптом `bash backend/scripts/e2e.sh`; без E2E_API_URL пропускается.
 */
test.skip(!process.env.E2E_API_URL, 'нужен E2E_API_URL: запускайте через backend/scripts/e2e.sh');
test.skip(({ isMobile }) => isMobile, 'сценарий один, на компьютере');

test('Django: вход → запись → подтверждение репетитором → админ видит отмену', async ({ page, context }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('olga@mail.ru');
  await page.locator('input[type=password]').fill('wrong-password');
  await page.locator('button[type=submit]').click();
  await expect(page.getByText('Неверная почта или пароль')).toBeVisible();

  await login(page, 'student');
  await expect(page).toHaveURL(/\/me\/lessons/);

  await page.goto('/teachers/english/');
  await page.locator('.slot:not(.off)').first().click();
  await page.getByRole('link', { name: /Записаться/ }).first().click();
  await expect(page).toHaveURL(/\/book\/english/);
  await page.getByText(/Согласен/).first().click();
  await page.getByRole('button', { name: 'Записаться', exact: true }).click();
  await expect(page).toHaveURL(/\/done/);

  await context.clearCookies();
  await login(page, 'tutor');
  await page.goto('/tutor/lessons');
  await page.getByRole('button', { name: 'Подтвердить' }).first().click();
  await expect(page.getByText(/Подтверждён|Подтверждено/).first()).toBeVisible();

  await context.clearCookies();
  await login(page, 'admin');
  await expect(page).toHaveURL(/\/admin/);
  await page.goto('/admin/cancellations');
  await expect(page.getByText('Заболел ребёнок')).toBeVisible();
});
