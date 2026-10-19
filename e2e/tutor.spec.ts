import { expect, test } from '@playwright/test';
import { login, logout } from './helpers';

test.describe('репетитор и администратор', () => {
  test('регистрация → анкета → проверка админом → публикация в каталоге', async ({ page }) => {
    await page.goto('/signup');
    await page.getByText('Хочу преподавать').click();
    await page.locator('input:not([type]), input[autocomplete=name]').first().fill('Ирина Тестова');
    await page.locator('input[type=email]').fill('irina.tutor@mail.ru');
    await page.locator('input[type=password]').fill('password1');
    await page.getByText(/Принимаю/).click();
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await expect(page).toHaveURL(/verify-email/);
    await page.getByRole('button', { name: /Подтвердить почту/ }).click();
    await expect(page).toHaveURL(/\/tutor\/profile\/edit/);

    // шаг 1: пустые поля не пропускают дальше
    await page.getByRole('button', { name: 'Дальше' }).click();
    await expect(page.getByText('Напишите, чем вы занимаетесь')).toBeVisible();
    await page.getByLabel('Коротко о вас').fill('Репетитор по математике для школьников');
    await page.getByLabel('О себе').fill('Работаю со школьниками пятый год: разбираем темы с нуля, готовимся к ОГЭ и ЕГЭ.');
    await page.getByRole('button', { name: 'Дальше' }).click();

    // шаг 2
    await page.getByRole('button', { name: 'Математика', exact: true }).click();
    await page.getByRole('button', { name: '5–9 класс' }).click();
    await page.getByLabel('Опыт преподавания').selectOption({ label: '3–5 лет' });
    await page.getByRole('button', { name: 'Дальше' }).click();

    // шаг 3: цена
    await page.getByLabel('Цена за урок, ₽').fill('1800');
    await page.getByRole('button', { name: 'Дальше' }).click();

    // шаг 4: хотя бы одно время
    await page.getByRole('button', { name: 'Дальше' }).click();
    await expect(page.getByText('Откройте хотя бы одно время')).toBeVisible();
    await page.getByRole('button', { name: 'Добавить время' }).first().click();
    await page.getByRole('button', { name: 'Дальше' }).click();

    // шаг 5
    await page.getByRole('button', { name: 'Отправить на проверку' }).click();
    await expect(page).toHaveURL(/\/tutor\/profile$/);
    await logout(page);

    // администратор публикует анкету
    await login(page, 'admin');
    await page.goto('/admin/profiles');
    await expect(page.getByText('Ирина Тестова').first()).toBeVisible();
    await page.getByRole('button', { name: 'Опубликовать' }).first().click();
    await expect(page.getByText('Очередь пуста')).toBeVisible();
    await logout(page);

    // анкета появилась в каталоге
    await page.goto('/teachers/');
    await page.getByRole('searchbox').or(page.locator('input[type=search], input.trh-search-input')).first().fill('Ирина');
    await expect(page.locator('a.tc', { hasText: 'Ирина' }).first()).toBeVisible();
  });

  test('спор: репетитор отвечает, администратор возвращает деньги, отзыв публикуется', async ({ page }) => {
    await login(page, 'student');
    await page.goto('/me/lessons/l-4/review');
    await page.locator('.trk-rating-star').nth(4).click();
    await page.locator('textarea').fill('Очень понятно объясняет, после урока всё стало ясно и понятно.');
    await page.getByRole('button', { name: 'Отправить отзыв' }).click();
    await expect(page.getByText('Спасибо за отзыв')).toBeVisible();
    await page.goto('/me/lessons/l-7');
    await page.getByRole('link', { name: 'Сообщить о проблеме' }).click();
    await page.getByRole('button', { name: 'Репетитор не пришёл' }).click();
    await page.locator('textarea').fill('Ждали двадцать минут, репетитор не вышел на связь.');
    await page.getByRole('button', { name: 'Отправить обращение' }).click();
    await expect(page).toHaveURL(/\/me\/disputes\/([^/]+)/);
    const disputeId = page.url().split('/disputes/')[1];
    await logout(page);

    await login(page, 'tutor');
    await page.goto('/tutor/notifications');
    await expect(page.getByText('Ученик сообщил о проблеме')).toBeVisible();
    await page.goto(`/tutor/disputes/${disputeId}`);
    await page.locator('textarea').fill('Я была на связи в назначенное время, ученик не подключился.');
    await page.getByRole('button', { name: 'Отправить ответ' }).click();
    await expect(page.getByText(/Ответ отправлен/).first()).toBeVisible();
    await logout(page);

    await login(page, 'admin');
    await page.goto('/admin/disputes');
    await page.getByRole('button', { name: 'Вернуть деньги ученику' }).first().click();
    await page.getByRole('button', { name: 'Подтвердить' }).click();
    await expect(page.getByText('Открытых споров нет')).toBeVisible();
    await page.goto('/admin/reviews');
    await page.getByRole('button', { name: 'Опубликовать' }).first().click();
    await expect(page.getByText('Очередь пуста')).toBeVisible();
  });
});
