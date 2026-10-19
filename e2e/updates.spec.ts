import { expect, test } from '@playwright/test';
import { isPhone, login } from './helpers';

test('каталог: поле поиска во всю ширину, не короткое', async ({ page }) => {
  test.skip(isPhone(page), 'проверка для компьютера');
  await page.goto('/teachers');
  const box = await page.locator('search form.search').boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(700);
});

test('анкета: в карточке записи нет отдельной кнопки знакомства', async ({ page }) => {
  test.skip(isPhone(page), 'карточка записи справа только на компьютере');
  await page.goto('/teachers/english');
  const aside = page.locator('.trh-pf-aside');
  await expect(aside.getByRole('button', { name: 'Бесплатное знакомство' })).toHaveCount(0);
  await expect(aside.getByRole('link', { name: 'Бесплатное знакомство' })).toHaveCount(0);
});

test('платежи и уведомления на всю ширину компьютера, кнопки не узкие', async ({ page }) => {
  test.skip(isPhone(page), 'проверка для компьютера');
  await login(page, 'student');
  for (const path of ['/me/payments', '/me/notifications']) {
    await page.goto(path);
    await expect(page.locator('.trk-list').first()).toBeVisible();
    const main = await page.locator('.trk-list').first().boundingBox();
    expect(main?.width ?? 0, path).toBeGreaterThan(900);
  }
});

test('колокольчик показывает число непрочитанных', async ({ page }) => {
  test.skip(isPhone(page), 'колокольчик в шапке кабинета на компьютере');
  await login(page, 'student');
  await page.goto('/me/lessons');
  const badge = page.locator('a[aria-label="Уведомления"] .trk-badge');
  await expect(badge).toHaveText(/^\d+$/);
});

test('из диалога имя и фото ведут на анкету, стрелка возвращает к сообщениям', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/chats/new?tutor=english');
  await expect(page).toHaveURL(/\/me\/chats\/(?!new)[^/?]+$/);
  const chatUrl = page.url();
  await page.locator('a.tg-peer').click();
  await expect(page).toHaveURL(/\/teachers\/english/);
  await page.getByRole('link', { name: /К сообщениям/ }).or(page.getByRole('button', { name: /Назад/ })).first().click();
  await expect(page).toHaveURL(chatUrl);
});

test('профиль: смена пароля, выход с подтверждением', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/account');
  await page.getByLabel('Текущий пароль').fill('неверный');
  await page.getByLabel('Новый пароль').fill('newpassword1');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await expect(page.getByText('Текущий пароль указан неверно')).toBeVisible();
  await page.getByLabel('Текущий пароль').fill('demo');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await expect(page.getByText('Пароль изменён')).toBeVisible();
  // возвращаем демо-пароль, чтобы не ломать другие сценарии
  await page.getByLabel('Текущий пароль').fill('newpassword1');
  await page.getByLabel('Новый пароль').fill('demo1234');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).not.toHaveURL(/\/me\/account/);
});
