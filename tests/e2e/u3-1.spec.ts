import { expect, test } from '@playwright/test';
import { createUser, signUpInForm, uniqueEmail } from './helpers';

test.describe('У3.1 регистрация', () => {
  test('У3.1 ученик регистрируется по имени, email и паролю и попадает в «Мои занятия»', async ({ page }, info) => {
    await page.goto('/signup/');
    await expect(page.getByRole('radio', { name: 'Я учусь' })).toBeChecked();
    await signUpInForm(page, { name: 'Ирина', email: uniqueEmail('u31-student', info) });
    await expect(page).toHaveURL(/\/cabinet\/$/);
    await expect(page.getByRole('heading', { name: 'Мои занятия' })).toBeVisible();
    await expect(page.getByText('Здесь появятся ваши занятия')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Кабинет: Ирина' })).toBeVisible();
  });

  test('У3.1 Р1.1 репетитор после регистрации видит сводку со списком того, что нужно для публикации', async ({ page }, info) => {
    await page.goto('/signup/?role=tutor');
    await expect(page.getByRole('radio', { name: 'Я преподаю' })).toBeChecked();
    await signUpInForm(page, { name: 'Анна Ковалёва', email: uniqueEmail('u31-tutor', info) });
    await expect(page).toHaveURL(/\/tutor\/$/);
    await expect(page.getByRole('heading', { name: 'Здравствуйте, Анна' })).toBeVisible();
    await expect(page.getByText('Не опубликована')).toBeVisible();
    const list = page.getByRole('list', { name: 'Что нужно для публикации' });
    await expect(list.getByRole('listitem')).toHaveText([
      'Фото — не хватает',
      'Имя — готово',
      'Предмет с ценой — не хватает',
      'Свободное время в расписании — не хватает',
    ]);
  });

  test('У3.1 после регистрации человек возвращается на адрес из ?next=', async ({ page }, info) => {
    await page.goto(`/signup/?next=${encodeURIComponent('/cabinet/settings/')}`);
    await signUpInForm(page, { name: 'Ирина', email: uniqueEmail('u31-next', info) });
    await expect(page).toHaveURL(/\/cabinet\/settings\/$/);
  });

  test('У3.1 занятый email: текст, что аккаунт есть, и ссылка на вход', async ({ page, request }, info) => {
    const email = uniqueEmail('u31-taken', info);
    await createUser(request, { email, role: 'tutor', name: 'Анна' });
    await page.goto('/signup/');
    await signUpInForm(page, { name: 'Ирина', email });
    await expect(page.getByText('С этим email уже есть аккаунт.', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/signup\/$/);
    await page.getByRole('link', { name: 'Войти с этим email' }).click();
    await expect(page).toHaveURL(/\/login\//);
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
  });

  test('У3.1 роль выбирается один раз: в настройках её нельзя поменять, чужой кабинет закрыт', async ({ page }, info) => {
    await page.goto('/signup/');
    await signUpInForm(page, { name: 'Ирина', email: uniqueEmail('u31-role', info) });
    await expect(page).toHaveURL(/\/cabinet\/$/);
    await page.goto('/cabinet/settings/');
    await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
    await expect(page.getByLabel('Имя')).toHaveValue('Ирина');
    await expect(page.getByLabel('Часовой пояс')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByLabel(/^Роль/)).toHaveCount(0);
    await expect(page.getByText('Я преподаю')).toHaveCount(0);
    await expect(page.getByText('Я учусь')).toHaveCount(0);
    // a student who opens the tutor cabinet is sent to their own one
    await page.goto('/tutor/');
    await expect(page).toHaveURL(/\/cabinet\/$/);
  });
});
