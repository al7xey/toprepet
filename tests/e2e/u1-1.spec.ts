import { expect, test } from '@playwright/test';
import { cleanBooking, publishedTutor, rest, showAll, uniqueWord, type PublishedTutor } from './helpers';

test.use({ timezoneId: 'Europe/Moscow' });

test.describe('У1.1 поиск по предмету', () => {
  let tutors: PublishedTutor[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors });
    tutors = [];
  });

  test('У1.1 ввожу «англ»: в подсказках «Английский язык», после выбора только анкеты с этим предметом', async ({ page, request }, info) => {
    const word = uniqueWord();
    const english = await publishedTutor(request, info, { name: `Анна ${word}`, subjects: [{ slug: 'english', prices: { 60: 2000 } }] });
    const math = await publishedTutor(request, info, { name: `Дмитрий ${word}` });
    tutors = [english, math];

    await page.goto('/teachers/');
    await expect(page.getByRole('heading', { name: 'Топ репеты' })).toBeVisible();
    await page.getByLabel('Чему хотите научиться?').fill('англ');
    const hints = page.getByRole('list', { name: 'Подсказки' });
    await expect(hints.getByRole('button', { name: 'Английский язык' })).toBeVisible();
    await hints.getByRole('button', { name: 'Английский язык' }).click();

    await expect(page).toHaveURL(/\/teachers\/\?subject=english$/);
    await expect(page.getByLabel('Чему хотите научиться?')).toHaveValue('Английский язык');
    await showAll(page);
    const grid = page.getByRole('list', { name: 'Преподаватели' });
    await expect(grid.getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();
    await expect(grid.getByRole('link', { name: new RegExp(`Дмитрий ${word}`) })).toHaveCount(0);
    for (const label of await grid.getByRole('link').evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''))) {
      expect(label).toContain('Английский язык');
    }
    // the card opens the profile with the same subject
    await grid.getByRole('link', { name: new RegExp(`Анна ${word}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/teachers/${english.slug}/\\?subject=english`));
    await expect(page.getByRole('heading', { name: `Анна ${word}` })).toBeVisible();
  });

  test('У1.1 снимаю чип предмета: снова видны все опубликованные анкеты', async ({ page, request }, info) => {
    const word = uniqueWord();
    const english = await publishedTutor(request, info, { name: `Анна ${word}`, subjects: [{ slug: 'english', prices: { 60: 2000 } }] });
    const math = await publishedTutor(request, info, { name: `Дмитрий ${word}` });
    tutors = [english, math];

    await page.goto('/teachers/?subject=english');
    await expect(page.getByRole('button', { name: 'Снять фильтр «Английский язык»' })).toBeVisible();
    await page.getByRole('button', { name: 'Снять фильтр «Английский язык»' }).click();
    await expect(page).toHaveURL(/\/teachers\/$/);
    await expect(page.getByRole('button', { name: 'Все фильтры' })).toBeVisible();
    await showAll(page);
    const grid = page.getByRole('list', { name: 'Преподаватели' });
    await expect(grid.getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();
    await expect(grid.getByRole('link', { name: new RegExp(`Дмитрий ${word}`) })).toBeVisible();
  });

  test('У1.1 в каталоге только опубликованные анкеты со свободным слотом в горизонте записи', async ({ page, request }, info) => {
    const word = uniqueWord();
    const open = await publishedTutor(request, info, { name: `Анна ${word}` });
    const full = await publishedTutor(request, info, { name: `Ольга ${word}` });
    const hidden = await publishedTutor(request, info, { name: `Мария ${word}` });
    tutors = [open, full, hidden];
    // no free time any more: the windows are gone
    expect((await rest(request, full.token).del(`weekly_windows?tutor_id=eq.${full.id}`)).ok).toBeTruthy();
    await rest(request, hidden.token).rpc('unpublish_tutor');

    await page.goto(`/teachers/?q=${encodeURIComponent(word)}`);
    const grid = page.getByRole('list', { name: 'Преподаватели' });
    await expect(grid.getByRole('link', { name: new RegExp(`Анна ${word}`) })).toBeVisible();
    await expect(page.getByText(/^Найдено:/)).toHaveText('Найдено: 1 преподаватель');
    await expect(grid.getByRole('link', { name: new RegExp(`Мария ${word}`) })).toHaveCount(0);
    await expect(grid.getByRole('link', { name: new RegExp(`Ольга ${word}`) })).toHaveCount(0);
  });
});
