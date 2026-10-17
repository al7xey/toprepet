import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('ученик', () => {
  test('запись на урок с оплатой картой, затем отмена', async ({ page }) => {
    await login(page, 'student');
    await page.goto('/teachers/english/');
    await page.locator('.slot:not([disabled])').first().click();
    await page.getByRole('link', { name: 'Записаться' }).first().click();
    await expect(page).toHaveURL(/\/book\/english/);
    await expect(page.getByText('Способ оплаты')).toBeVisible();
    await page.waitForLoadState('networkidle');

    // если у ученика нет карты, добавляем тестовую
    if (await page.getByText('Карты пока нет').count()) {
      await page.getByRole('button', { name: 'Добавить карту' }).first().click();
      await page.locator('input[autocomplete=cc-number]').fill('4000 0000 0000 0002');
      await page.locator('input[autocomplete=cc-exp]').fill('12/30');
      await page.locator('input[autocomplete=cc-csc]').fill('123');
      await page.getByRole('button', { name: 'Сохранить карту' }).click();
    }
    await page.getByText('Согласен(на) с правилами').click();
    // на загруженной машине клик может прийти до того, как форма дорисовалась: повторяем, пока запись не уйдёт
    await expect(async () => {
      await page.getByRole('button', { name: 'Записаться', exact: true }).click();
      await expect(page).toHaveURL(/\/done/, { timeout: 3000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Запись отправлена' })).toBeVisible();

    await page.getByRole('link', { name: 'Открыть запись' }).click();
    await page.getByRole('button', { name: 'Отменить урок' }).click();
    await page.getByRole('button', { name: 'Изменились планы' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Отменить урок' }).click();
    await expect(page.getByText(/Отменён|отменён|Отменено/).first()).toBeVisible();
  });

  test('чат: контакты в сообщении не отправляются', async ({ page }) => {
    await login(page, 'student');
    await page.goto('/me/chats/new?tutor=english');
    await expect(page).toHaveURL(/\/me\/chats\/[^/]+$/);
    const box = page.getByLabel('Сообщение');
    await box.fill('Напишите мне в телеграм: https://t.me/someone или звоните +7 999 123-45-67');
    await page.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(page.getByText(/запрещены/)).toBeVisible();
    await box.fill('Здравствуйте! Хочу заниматься английским перед экзаменом.');
    await page.getByRole('button', { name: 'Отправить', exact: true }).click();
    await expect(page.getByText('Хочу заниматься английским перед экзаменом.')).toBeVisible();
  });

  test('сброс пароля: письмо → новый пароль → вход', async ({ page }) => {
    await page.goto('/reset-password');
    await page.locator('input[type=email]').fill('olga@mail.ru');
    await page.getByRole('button', { name: 'Отправить ссылку' }).click();
    await expect(page.getByText(/ссылк/i).first()).toBeVisible();
    // мок принимает любой токен и меняет пароль того, кто запросил сброс
    await page.goto('/reset-password?token=demo');
    await page.getByLabel('Новый пароль').fill('short');
    await page.getByRole('button', { name: 'Сохранить пароль' }).click();
    await expect(page.getByText('не короче 8 символов').first()).toBeVisible();
    await page.getByLabel('Новый пароль').fill('new-password-1');
    await page.getByRole('button', { name: 'Сохранить пароль' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.locator('input[type=email]').fill('olga@mail.ru');
    await page.locator('input[type=password]').fill('wrong-pass-1');
    await page.locator('button[type=submit]').click();
    await expect(page.getByText(/Неверн/)).toBeVisible();
    await page.locator('input[type=password]').fill('new-password-1');
    await page.locator('button[type=submit]').click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('отзыв и спор: ученик оставляет отзыв и сообщает о проблеме', async ({ page }) => {
    await login(page, 'student');
    await page.goto('/me/lessons/l-4');
    await page.getByRole('link', { name: 'Оставить отзыв' }).click();
    await page.getByRole('button', { name: 'Отправить отзыв' }).click();
    await expect(page.getByText('Поставьте оценку')).toBeVisible();
    await page.locator('.trk-rating-star').nth(4).click();
    await page.locator('textarea').fill('Очень понятно объясняет, после урока всё стало ясно и понятно.');
    await page.getByRole('button', { name: 'Отправить отзыв' }).click();
    await expect(page).toHaveURL(/\/me\/lessons\/l-4$/);
    await expect(page.getByText('Спасибо за отзыв')).toBeVisible();

    await page.goto('/me/lessons/l-7');
    await page.getByRole('link', { name: 'Сообщить о проблеме' }).click();
    await page.getByRole('button', { name: 'Репетитор не пришёл' }).click();
    await page.locator('textarea').fill('Ждали двадцать минут, репетитор не вышел на связь.');
    await page.getByRole('button', { name: 'Отправить обращение' }).click();
    await expect(page).toHaveURL(/\/me\/disputes\//);
  });
});
