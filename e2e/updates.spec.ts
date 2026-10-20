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

test('колокольчик показывает непрочитанное маленькой точкой, а не числом', async ({ page }) => {
  test.skip(isPhone(page), 'колокольчик в шапке кабинета на компьютере');
  await login(page, 'student');
  await page.goto('/me/lessons');
  const badge = page.locator('a[aria-label="Уведомления"] .trk-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('');
  const box = await badge.boundingBox();
  expect(box?.width ?? 99).toBeLessThanOrEqual(12);
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

test('профиль: сводка по заявкам, настройки отдельной страницей, смена пароля, выход с подтверждением', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/account');
  const main = page.locator('#main');
  // заявки, уведомления и платежи — прямо в профиле, заявку можно создать из окна
  await expect(main.getByRole('heading', { name: 'Мои заявки' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Уведомления' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Платежи' })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Сменить пароль' })).toHaveCount(0);
  await main.getByRole('button', { name: 'Новая заявка' }).click();
  await expect(page.getByRole('dialog', { name: 'Новая заявка' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click();
  // настройки — полноценная страница, её открывают шестерёнка и карточка с именем
  await page.getByRole('link', { name: 'Настройки', exact: true }).click();
  await expect(page).toHaveURL(/\/me\/account\/settings/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await page.getByLabel('Текущий пароль').fill('неверный');
  await page.getByLabel('Новый пароль').fill('newpassword1');
  await page.getByRole('button', { name: 'Сменить пароль', exact: true }).click();
  await expect(page.getByText('Текущий пароль указан неверно')).toBeVisible();
  await page.getByLabel('Текущий пароль').fill('demo');
  await page.getByRole('button', { name: 'Сменить пароль', exact: true }).click();
  await expect(page.getByText('Пароль изменён')).toBeVisible();
  // возвращаем демо-пароль, чтобы не ломать другие сценарии
  await page.getByRole('button', { name: 'Сменить пароль' }).click();
  await page.getByLabel('Текущий пароль').fill('newpassword1');
  await page.getByLabel('Новый пароль').fill('demo1234');
  await page.getByRole('button', { name: 'Сменить пароль', exact: true }).click();
  await expect(page.getByText('Пароль изменён').first()).toBeVisible();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).not.toHaveURL(/\/me\/account/);
});

test('профиль: карточка с именем открывает настройки', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/account');
  await page.getByRole('link', { name: 'Настройки профиля' }).click();
  await expect(page).toHaveURL(/\/me\/account\/settings/);
});

test('уведомление об успехе приходит в зелёном окне, а не в белом', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/account/settings');
  await page.getByRole('button', { name: 'Личные данные' }).click();
  await page.getByRole('button', { name: 'Сохранить' }).click();
  const toast = page.locator('.trk-toast.ok').first();
  await expect(toast).toBeVisible();
  expect(await toast.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
});

test('чат: фото сжимается и отправляется, у своего сообщения одна галочка', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/chats/new?tutor=english');
  await expect(page).toHaveURL(/\/me\/chats\/(?!new)[^/?]+$/);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('input[type=file]').setInputFiles({ name: 'zadanie.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.tg-thread .tg-photo').last()).toBeVisible();
  // у своего непрочитанного сообщения одна галочка
  await expect(page.locator('.tg-msg.out').last().locator('small .i-tick')).toHaveCount(1);
  await expect(page.locator('.tg-msg.out').last().locator('small .i-ticks')).toHaveCount(0);
});

test('анкета: метка «Документы проверены» видна сразу и не пропадает', async ({ page }) => {
  await page.goto('/teachers/english');
  const tag = page.getByText('Документы проверены').first();
  await expect(tag).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(tag).toBeVisible();
  const opacity = await tag.evaluate((node) => Number(getComputedStyle(node).opacity) * Number(getComputedStyle(node.closest('.trh-sec') ?? node).opacity));
  expect(opacity).toBe(1);
});

test('расписание: недельный шаблон и выбор дат в календаре', async ({ page }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/schedule');
  await expect(page.getByRole('tab', { name: 'Каждую неделю' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'По датам' }).click();
  // выбираем сегодняшнюю дату или ближайший доступный день недели вперёд
  const days = page.locator('.trk-month-day:not([disabled])');
  await days.nth(2).click();
  await page.getByRole('button', { name: 'Выходной', exact: true }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByText('Сохранено').first()).toBeVisible();
  await expect(page.locator('.trk-month-day.m-off')).toHaveCount(1);
  // возвращаем день по расписанию
  await page.getByRole('button', { name: 'Как обычно' }).click();
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.locator('.trk-month-day.m-off')).toHaveCount(0);
});
