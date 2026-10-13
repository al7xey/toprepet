import { expect, test } from '@playwright/test';
import { createUser, logInInForm, uniqueEmail } from './helpers';

test.describe('У2.1-вход вход только когда нужен', () => {
  test('У2.1-вход гость открывает главную и каталог без входа', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-12T12:00:00+03:00'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Индивидуальные занятия/ })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/teachers/');
    await expect(page.getByRole('heading', { name: 'Репетиторы', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/teachers\/$/);
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
  });

  test('У2.1-вход гость на /cabinet/ видит вход, а после входа возвращается в /cabinet/', async ({ page, request }, info) => {
    const email = uniqueEmail('u21-guest', info);
    await createUser(request, { email });
    await page.goto('/cabinet/');
    await expect(page).toHaveURL(/\/login\/\?next=%2Fcabinet%2F$/);
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await logInInForm(page, email);
    await expect(page).toHaveURL(/\/cabinet\/$/);
    await expect(page.getByRole('heading', { name: 'Мои занятия' })).toBeVisible();
  });

  test('У2.1-вход неверный пароль: ошибка текстом, вход не происходит', async ({ page, request }, info) => {
    const email = uniqueEmail('u21-wrong', info);
    await createUser(request, { email });
    await page.goto('/login/');
    await logInInForm(page, email, 'not-the-password');
    await expect(page.getByText('Email или пароль не подходят. Проверьте раскладку или восстановите пароль.')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/login\/$/);
  });

  test('У2.1-вход репетитор после входа попадает в сводку, кабинет ученика ему закрыт', async ({ page, request }, info) => {
    const email = uniqueEmail('u21-tutor', info);
    await createUser(request, { email, role: 'tutor', name: 'Анна Ковалёва' });
    await page.goto('/login/');
    await logInInForm(page, email);
    await expect(page).toHaveURL(/\/tutor\/$/);
    await page.goto('/cabinet/');
    await expect(page).toHaveURL(/\/tutor\/$/);
  });
});
