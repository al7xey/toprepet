import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, isPhone } from './helpers';

test.describe('гость', () => {
  test('шапка: одна кнопка «Войти», регистрация есть в меню телефона', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header a', { hasText: 'Войти' })).toHaveCount(1);
    await expect(page.locator('header a', { hasText: 'Регистрация' })).toHaveCount(0);
    if (isPhone(page)) {
      await page.getByRole('button', { name: 'Открыть меню' }).click();
      await page.getByRole('link', { name: /Регистрация/ }).click();
      await expect(page).toHaveURL(/\/signup/);
    }
  });

  test('каталог → анкета → запись на знакомство ведёт на вход и обратно', async ({ page }) => {
    await page.goto('/teachers/');
    await page.locator('a.tc').first().click();
    await expect(page).toHaveURL(/\/teachers\/[^/]+\/?$/);
    await page.locator('.slot:not([disabled])').first().click();
    await page.getByRole('link', { name: 'Записаться' }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.locator('input[type=email]').fill('olga@mail.ru');
    await page.locator('input[type=password]').fill('demo');
    await page.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/book\//);
  });

  test('заявки учеников скрыты от гостя, /requests ведёт на вход', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Создать заявку' })).toHaveCount(0);
    await page.goto('/requests');
    await expect(page).toHaveURL(/\/login/);
  });

  test('старые адреса ведут на новые страницы', async ({ page }) => {
    for (const [from, to] of [['/lessons', '/teachers'], ['/contact', '/help'], ['/free-intro', '/teachers?intro=1'], ['/for-tutors', '/for-repetitor'], ['/teacher/mathematics', '/teachers/mathematics']]) {
      await page.goto(from);
      await expect(page).toHaveURL(new RegExp(`${to.replace('?', '\\?')}/?$`));
    }
  });

  test('несуществующая страница: 404 без горизонтальной прокрутки', async ({ page }) => {
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { level: 1, name: 'Страница не найдена' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('документы открываются и не содержат убранных формулировок', async ({ page }) => {
    await page.goto('/legal/');
    for (const link of await page.locator('.trk-legal-list a').all()) await expect(link).toBeVisible();
    for (const slug of ['payment-refund', 'terms', 'tutor-terms', 'cookies']) {
      await page.goto(`/legal/${slug}/`);
      await expect(page.locator('h1')).toHaveCount(1);
      const text = await page.locator('main').innerText();
      expect(text).not.toMatch(/менеджер|промокод|20 минут/i);
    }
  });
});
