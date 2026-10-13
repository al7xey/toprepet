import { expect, test } from '@playwright/test';
import { cleanBooking, publishedTutor, uniqueWord, type PublishedTutor } from './helpers';

test.use({ timezoneId: 'Europe/Moscow' });

test.describe('У1.2 пустая выдача по запросу', () => {
  let tutors: PublishedTutor[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors });
    tutors = [];
  });

  test('У1.2 по запросу 0 анкет: ближайшие направления с анкетами и «Написать нам»', async ({ page, request }, info) => {
    const word = uniqueWord();
    const english = await publishedTutor(request, info, { name: `Анна ${word}`, subjects: [{ slug: 'english', prices: { 60: 2000 } }] });
    tutors = [english];

    await page.goto('/teachers/');
    await page.getByLabel('Чему хотите научиться?').fill('японский язык');
    await page.getByRole('button', { name: 'Найти' }).click();
    await expect(page).toHaveURL(/\?q=/);
    await expect(page.getByText('По вашему запросу преподавателей не нашлось')).toBeVisible();
    await expect(page.getByText('Попробуйте другое имя, предмет или тему. Похожие направления:')).toBeVisible();
    const support = page.getByRole('link', { name: 'Написать нам' });
    await expect(support).toHaveAttribute('href', 'https://t.me/toprepet_manager');
    // a nearby direction that does have tutors
    const nearby = page.getByRole('button', { name: 'Английский язык' });
    await expect(nearby).toBeVisible();
    await nearby.click();
    await expect(page).toHaveURL(/\/teachers\/\?subject=english$/);
    await expect(page.getByRole('list', { name: 'Преподаватели' }).getByRole('link').first()).toBeVisible();

    await page.goto('/teachers/?q=японский');
    await page.getByRole('button', { name: 'Показать всех' }).click();
    await expect(page).toHaveURL(/\/teachers\/$/);
    await expect(page.getByRole('list', { name: 'Преподаватели' })).toBeVisible();
  });
});
