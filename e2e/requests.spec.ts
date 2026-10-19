import { expect, test } from '@playwright/test';
import { login, logout } from './helpers';

test('заявка ученика → отклик репетитора → запись по отклику', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/requests/new');
  await page.getByRole('button', { name: 'Английский язык', exact: true }).click();
  await page.getByRole('button', { name: '5–9 класс', exact: true }).click();
  await page.getByRole('button', { name: 'Подготовка к ОГЭ или ЕГЭ' }).click();
  await page.getByRole('button', { name: 'Дальше' }).click();
  await page.getByRole('button', { name: 'Будни вечером' }).click();
  await page.getByLabel('Описание задачи').fill('Нужна подготовка к ОГЭ: разобрать темы, которые не получаются, и решать варианты.');
  await page.getByRole('button', { name: /Опубликовать/ }).click();
  await expect(page).toHaveURL(/\/me\/requests\/(?!new)[^/]+$/);
  const requestUrl = page.url();
  await expect(page.getByText('Откликов пока нет')).toBeVisible();
  await logout(page);

  await login(page, 'tutor');
  await page.goto('/tutor/requests');
  // нужная карточка — ближайший предок текста заявки, в котором есть кнопка отклика
  await page.getByText('решать варианты').locator('xpath=ancestor::*[.//button[normalize-space()="Откликнуться"]][1]').getByRole('button', { name: 'Откликнуться' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ваша цена за урок, ₽').fill('1700');
  await dialog.getByLabel('Сообщение ученику').fill('Здравствуйте! Подготовлю к ОГЭ по шагам, начнём с диагностики.');
  await dialog.locator('.slot:not([disabled])').first().click();
  await dialog.getByRole('button', { name: 'Отправить отклик' }).click();
  await expect(dialog).toBeHidden();
  await logout(page);

  await login(page, 'student');
  await page.goto(requestUrl);
  await expect(page.getByText('Подготовлю к ОГЭ по шагам')).toBeVisible();
  await page.getByRole('link', { name: /Записаться|\d{1,2}:\d{2}/ }).first().click();
  await expect(page).toHaveURL(/\/book\/.*request=/);
});

test('заявка со своим предметом видна репетитору, а несколько предметов выбираются сразу', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/me/requests/new');
  await page.getByRole('button', { name: 'Физика', exact: true }).click();
  await page.getByRole('button', { name: 'Другой предмет', exact: true }).click();
  await page.getByLabel('Какой предмет').fill('Шахматы');
  await page.getByRole('button', { name: 'Студент', exact: true }).click();
  await page.getByRole('button', { name: 'Домашние задания' }).click();
  await page.getByRole('button', { name: 'Дальше' }).click();
  await page.getByRole('button', { name: 'Выходные' }).click();
  await page.getByRole('button', { name: 'Своя цена' }).click();
  await page.getByLabel('Не больше, ₽ за урок').fill('900');
  await page.getByLabel('Описание задачи').fill('Хочу научиться играть');
  await page.getByRole('button', { name: /Опубликовать/ }).click();
  await expect(page).toHaveURL(/\/me\/requests\/(?!new)[^/]+$/);
  await expect(page.getByText('Физика, Шахматы').first()).toBeVisible();
  await logout(page);

  await login(page, 'tutor');
  await page.goto('/tutor/requests');
  await expect(page.getByText('Хочу научиться играть')).toBeVisible();
  await expect(page.getByText('Физика, Шахматы').first()).toBeVisible();
});
