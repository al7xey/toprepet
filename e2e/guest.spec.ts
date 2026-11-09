import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, isPhone } from './helpers';

test.describe('гость', () => {
  test('мобильное меню: Escape закрывает панель и возвращает фокус', async ({ page }) => {
    test.skip(!isPhone(page), 'только телефон');
    await page.goto('/teachers/');
    const trigger = page.getByRole('button', { name: 'Открыть меню', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('#public-menu');
    await expect(panel).toBeVisible();
    await expect(page.getByRole('button', { name: 'Закрыть меню' })).toHaveAttribute('aria-expanded', 'true');
    const rect = await panel.boundingBox();
    expect(rect!.height).toBeLessThan(page.viewportSize()!.height);
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('link', { name: 'Репетиторы', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await page.locator('footer').scrollIntoViewIfNeeded();
    await trigger.click();
    const header = await page.locator('.trh-public-nav > header').boundingBox();
    const openPanel = await panel.boundingBox();
    expect(openPanel!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    await panel.getByRole('link', { name: 'Помощь', exact: true }).click();
    await expect(page).toHaveURL(/\/help\/?$/);
    await expect(panel).toHaveCount(0);
  });

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
    // кнопка на главной есть, но гостя ведёт на вход
    await page.getByRole('link', { name: 'Создать заявку' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/requests');
    await expect(page).toHaveURL(/\/login/);
  });

  test('поиск: под полем только две кнопки с иконками, фильтр работает', async ({ page }) => {
    await page.goto('/teachers/');
    await expect(page.locator('.trh-tools .chipf')).toHaveCount(2);
    await expect(page.getByText('Найдено')).toHaveCount(0);
    const before = await page.locator('a.tc').count();
    await page.getByLabel('Фильтры').click();
    await page.getByRole('button', { name: 'Английский язык' }).click();
    await page.getByRole('button', { name: 'Показать' }).click();
    await expect.poll(() => page.locator('a.tc').count()).toBeLessThan(before);
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
