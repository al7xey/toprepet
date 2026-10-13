import { expect, test } from '@playwright/test';
import { cleanBooking, publishedTutor, uniqueWord, type PublishedTutor } from './helpers';

test.use({ timezoneId: 'Europe/Moscow' });

test.describe('У1.3 фильтры каталога', () => {
  let tutors: PublishedTutor[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors });
    tutors = [];
  });

  test('У1.3 «Все фильтры»: группы, кнопка показывает, сколько останется, активные фильтры снимаются по одному', async ({ page, request }, info) => {
    const word = uniqueWord();
    const cheap = await publishedTutor(request, info, { name: `Анна ${word}`, subjects: [{ slug: 'english', prices: { 60: 1500 } }], goals: ['ege'], exp: 3 });
    const dear = await publishedTutor(request, info, { name: `Ольга ${word}`, subjects: [{ slug: 'english', prices: { 60: 2500 } }], exp: 8 });
    tutors = [cheap, dear];

    await page.goto(`/teachers/?q=${encodeURIComponent(word)}`);
    await expect(page.getByText(/^Найдено:/)).toHaveText('Найдено: 2 преподавателя');
    await page.getByRole('button', { name: 'Все фильтры' }).click();
    const sheet = page.getByRole('dialog', { name: 'Фильтры' });
    for (const group of ['Предмет', 'Цель', 'Цена за 60 минут', 'Когда удобно', 'Опыт преподавания']) {
      await expect(sheet.getByRole('group', { name: group })).toBeVisible();
    }
    for (const goal of ['Школьная программа', 'Домашние задания', 'ОГЭ', 'ЕГЭ', 'Разговорный язык', 'Подготовка к школе']) {
      await expect(sheet.getByRole('group', { name: 'Цель' }).getByRole('button', { name: goal, exact: true })).toBeVisible();
    }
    await expect(sheet.getByText('По свободным окнам репетитора на ближайшие 2 недели, в вашем поясе')).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Показать 2' })).toBeVisible();
    await sheet.getByRole('button', { name: 'до 2 000 ₽' }).click();
    await expect(sheet.getByRole('button', { name: 'Показать 1' })).toBeVisible();
    await sheet.getByRole('button', { name: 'ЕГЭ', exact: true }).click();
    await expect(sheet.getByRole('button', { name: 'Показать 1' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Показать 1' }).click();

    await expect(page).toHaveURL(/price=2000/);
    await expect(page).toHaveURL(/goal=ege/);
    await expect(page.getByRole('button', { name: /Фильтры\s*2/ })).toBeVisible();
    const grid = page.getByRole('list', { name: 'Преподаватели' });
    await expect(grid.getByRole('link')).toHaveCount(1);
    await expect(grid.getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();

    // each active filter is removed on its own
    await page.getByRole('button', { name: 'Снять фильтр «до 2 000 ₽»' }).click();
    await expect(page).not.toHaveURL(/price=/);
    await expect(page).toHaveURL(/goal=ege/);
    await expect(grid.getByRole('link')).toHaveCount(1);
    await page.getByRole('button', { name: 'Снять фильтр «ЕГЭ»' }).click();
    await expect(grid.getByRole('link')).toHaveCount(2);
  });

  test('У1.3 «Когда удобно» по свободным окнам в поясе ученика; цель и опыт только у тех, кто их указал', async ({ page, request }, info) => {
    const word = uniqueWord();
    // Saturday and Sunday 10:00–14:00 in Moscow only; no goals, no experience
    const weekend = await publishedTutor(request, info, { name: `Вера ${word}`, exp: null, windows: [[6, 600, 840], [7, 600, 840]] });
    const always = await publishedTutor(request, info, { name: `Анна ${word}`, goals: ['school'], exp: 5 });
    tutors = [weekend, always];
    const grid = page.getByRole('list', { name: 'Преподаватели' });
    const q = `q=${encodeURIComponent(word)}`;

    await page.goto(`/teachers/?${q}&days=weekday`);
    await expect(grid.getByRole('link')).toHaveCount(1);
    await expect(grid.getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();
    await page.goto(`/teachers/?${q}&days=weekend&parts=morning`);
    await expect(grid.getByRole('link')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Снять фильтр «Выходные, утро»' })).toBeVisible();
    await page.goto(`/teachers/?${q}&days=weekend&parts=evening`);
    await expect(grid.getByRole('link')).toHaveCount(1);
    await expect(grid.getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();

    await page.goto(`/teachers/?${q}&goal=school`);
    await expect(grid.getByRole('link')).toHaveCount(1);
    await page.goto(`/teachers/?${q}&exp=1`);
    await expect(grid.getByRole('link')).toHaveCount(1);
    // without these filters the profile without goal and experience is shown
    await page.goto(`/teachers/?${q}`);
    await expect(grid.getByRole('link')).toHaveCount(2);
  });

  test('У1.3 по фильтрам 0 анкет: какой фильтр снять, сколько тогда найдётся, «Сбросить все»', async ({ page, request }, info) => {
    const word = uniqueWord();
    const cheap = await publishedTutor(request, info, { name: `Анна ${word}`, subjects: [{ slug: 'english', prices: { 60: 1500 } }], exp: 3 });
    const dear = await publishedTutor(request, info, { name: `Ольга ${word}`, subjects: [{ slug: 'english', prices: { 60: 2500 } }], exp: 8 });
    tutors = [cheap, dear];

    await page.goto(`/teachers/?q=${encodeURIComponent(word)}&price=1500&exp=5`);
    await expect(page.getByText('С такими фильтрами преподавателей нет')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Без «от 5 лет»: 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Без «до 1 500 ₽»: 1' })).toBeVisible();
    await page.getByRole('button', { name: 'Без «от 5 лет»: 1' }).click();
    await expect(page).not.toHaveURL(/exp=/);
    await expect(page.getByRole('list', { name: 'Преподаватели' }).getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();

    await page.goto(`/teachers/?q=${encodeURIComponent(word)}&price=1500&exp=5`);
    await page.getByRole('button', { name: 'Сбросить все' }).click();
    await expect(page).toHaveURL(/\/teachers\/$/);
    await expect(page.getByRole('button', { name: 'Все фильтры' })).toBeVisible();
  });
});
