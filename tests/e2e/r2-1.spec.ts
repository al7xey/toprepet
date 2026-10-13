import { expect, test } from '@playwright/test';
import { rest, signInNewTutor } from './helpers';

const PHOTO = 'tests/e2e/fixtures/tutor-photo.jpg';
const NOT_PHOTO = 'tests/e2e/fixtures/not-a-photo.txt';

test.describe('Р2.1 анкета и цены', () => {
  test('Р2.1 репетитор заполняет анкету: фото 4:5, имя, о себе, опыт, образование, подход, предметы с темами, цели, пояс, цены', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    await page.goto('/tutor/profile/');
    await expect(page.getByRole('heading', { name: 'Анкета' })).toBeVisible();

    await page.getByLabel('Загрузить фото').setInputFiles(PHOTO);
    const img = page.getByRole('img', { name: 'Ваше фото в анкете' });
    await expect(img).toBeVisible();
    const box = (await img.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(0.8, 1);

    await page.getByLabel('Имя и фамилия').fill('Анна Тестова');
    await page.getByLabel('О себе').fill('Готовлю к собеседованиям и экзаменам.');
    await page.getByLabel('Образование и достижения').fill('МГУ, CELTA');
    await page.getByLabel('Подход к занятиям').fill('Занятия строю вокруг ваших задач.');
    await page.getByLabel('Добавить предмет').selectOption({ label: 'Английский язык' });
    await page.getByLabel('Темы: Английский язык').fill('IELTS, разговорная практика');
    await page.getByLabel('ОГЭ').check();
    await page.getByLabel('Разговорный язык').check();
    await page.getByLabel('Опыт преподавания').fill('8');
    await page.getByLabel('Часовой пояс').selectOption('Asia/Yekaterinburg');
    await page.getByLabel('Английский язык за 60 минут').fill('2 000');
    await page.getByLabel('Английский язык за 90 минут').fill('3000');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Сохранили анкету.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('img', { name: 'Ваше фото в анкете' })).toBeVisible();
    await expect(page.getByLabel('Имя и фамилия')).toHaveValue('Анна Тестова');
    await expect(page.getByLabel('Образование и достижения')).toHaveValue('МГУ, CELTA');
    await expect(page.getByLabel('Подход к занятиям')).toHaveValue('Занятия строю вокруг ваших задач.');
    await expect(page.getByLabel('Темы: Английский язык')).toHaveValue('IELTS, разговорная практика');
    await expect(page.getByLabel('ОГЭ')).toBeChecked();
    await expect(page.getByLabel('Разговорный язык')).toBeChecked();
    await expect(page.getByLabel('ЕГЭ')).not.toBeChecked();
    await expect(page.getByLabel('Опыт преподавания')).toHaveValue('8');
    await expect(page.getByLabel('Часовой пояс')).toHaveValue('Asia/Yekaterinburg');
    await expect(page.getByLabel('Английский язык за 60 минут')).toHaveValue('2000');
    await expect(page.getByLabel('Английский язык за 90 минут')).toHaveValue('3000');
    await expect(page.getByLabel('Английский язык за 45 минут')).toHaveValue('');

    const db = rest(request, tutor.token);
    const row = (await db.get(`tutors?user_id=eq.${tutor.id}&select=slug,photo_path,goals,experience_years`)).body as {
      slug: string;
      photo_path: string;
      goals: string[];
      experience_years: number;
    }[];
    expect(row[0].slug).toMatch(/^anna-testova(-[a-z0-9]{4})?$/);
    expect(row[0].photo_path.startsWith(`${tutor.id}/`)).toBeTruthy();
    expect(row[0].goals.sort()).toEqual(['oge', 'speaking']);
    expect(row[0].experience_years).toBe(8);
    const prices = (await db.get(`prices?tutor_id=eq.${tutor.id}&select=duration_min,price_rub&order=duration_min`)).body;
    expect(prices).toEqual([
      { duration_min: 60, price_rub: 2000 },
      { duration_min: 90, price_rub: 3000 },
    ]);
  });

  test('Р2.1 цена 299 и 20 001 ₽ не принимается, ошибка объяснена текстом', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    await page.goto('/tutor/profile/');
    await page.getByLabel('Добавить предмет').selectOption({ label: 'Математика' });
    const price = page.getByLabel('Математика за 60 минут');
    const save = page.getByRole('button', { name: 'Сохранить', exact: true });
    const fieldError = page.locator('.prow .err');

    for (const bad of ['299', '20001', '1500,50']) {
      await price.fill(bad);
      await save.click();
      await expect(fieldError).toHaveText('Цена — целое число от 300 до 20 000 ₽, без копеек.');
      await expect(price).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByText('Проверьте поля с ошибками: анкета не сохранена.')).toBeVisible();
    }
    const db = rest(request, tutor.token);
    expect((await db.get(`prices?tutor_id=eq.${tutor.id}`)).body).toEqual([]);

    await price.fill('20000');
    await save.click();
    await expect(page.getByText('Сохранили анкету.')).toBeVisible();
    await expect(fieldError).toHaveCount(0);
    expect((await db.get(`prices?tutor_id=eq.${tutor.id}&select=price_rub`)).body).toEqual([{ price_rub: 20000 }]);
  });

  test('Р2.1 фото не того формата не загружается, ошибка текстом', async ({ page, request }, info) => {
    await signInNewTutor(page, request, info);
    await page.goto('/tutor/profile/');
    await page.getByLabel('Загрузить фото').setInputFiles(NOT_PHOTO);
    await expect(page.getByText('Подойдёт фото в формате JPEG, PNG или WebP.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Ваше фото в анкете' })).toHaveCount(0);
  });

  test('Р2.1 удалённый предмет уходит вместе с ценами', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    await page.goto('/tutor/profile/');
    await page.getByLabel('Добавить предмет').selectOption({ label: 'Физика' });
    await page.getByLabel('Физика за 45 минут').fill('1500');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Сохранили анкету.')).toBeVisible();
    await page.getByRole('button', { name: 'Убрать предмет Физика' }).click();
    await expect(page.getByLabel('Физика за 45 минут')).toHaveCount(0);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Сохранили анкету.')).toBeVisible();
    const db = rest(request, tutor.token);
    expect((await db.get(`prices?tutor_id=eq.${tutor.id}`)).body).toEqual([]);
    expect((await db.get(`tutor_subjects?tutor_id=eq.${tutor.id}`)).body).toEqual([]);
  });
});
