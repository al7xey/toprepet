import { expect, test } from '@playwright/test';
import { cleanUp, rest, seedWindows, signInNewTutor, type Account } from './helpers';

test.describe('Р2.1-публикация', () => {
  let published: Account | undefined;
  test.afterEach(async ({ request }) => {
    if (published) await cleanUp(request, { tutor: published });
    published = undefined;
  });

  test('Р2.1-публикация без фото, предмета с ценой и окна «Опубликовать» недоступна, рядом список недостающего', async ({ page, request }, info) => {
    await signInNewTutor(page, request, info);
    await page.goto('/tutor/profile/');
    const publish = page.getByRole('button', { name: 'Опубликовать' });
    await expect(publish).toBeDisabled();
    const list = page.getByRole('list', { name: 'Что нужно для публикации' });
    await expect(list.getByRole('listitem')).toHaveText([
      'Фото — не хватает',
      'Имя — готово',
      'Предмет с ценой — не хватает',
      'Свободное время в расписании — не хватает',
    ]);
    await expect(publish).toHaveAttribute('aria-describedby', (await list.getAttribute('id'))!);
    await expect(page.getByRole('link', { name: 'Добавить время' })).toHaveAttribute('href', '/tutor/schedule/');
    // an empty name is missing too
    await page.getByLabel('Имя и фамилия').fill('');
    await expect(list.getByRole('listitem').nth(1)).toHaveText('Имя — не хватает');
  });

  test('Р2.1-публикация когда всё есть, анкета сразу видна в каталоге без модерации и её можно скрыть', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    published = tutor;
    await seedWindows(request, tutor);
    await page.goto('/tutor/profile/');
    const publish = page.getByRole('button', { name: 'Опубликовать' });
    await expect(publish).toBeDisabled();

    await page.getByLabel('Загрузить фото').setInputFiles('tests/e2e/fixtures/tutor-photo.jpg');
    await expect(page.getByRole('img', { name: 'Ваше фото в анкете' })).toBeVisible();
    await page.getByLabel('Добавить предмет').selectOption({ label: 'Математика' });
    await page.getByLabel('Математика за 60 минут').fill('1800');
    await page.getByLabel('ЕГЭ').check();
    await expect(publish).toBeEnabled();
    await publish.click();

    await expect(page.getByText('Анкета опубликована и видна в каталоге «Топ репеты».')).toBeVisible();
    await expect(page.locator('.pill.ok', { hasText: 'Опубликована' })).toBeVisible();

    const guest = rest(request);
    const catalog = (await guest.rpc('catalog')).body as { user_id: string; name: string; price_from: number; goals: string[] }[];
    const mine = catalog.find(t => t.user_id === tutor.id);
    expect(mine).toMatchObject({ name: 'Анна Тестова', price_from: 1800, goals: ['ege'] });
    const publicRow = (await guest.get(`tutors?user_id=eq.${tutor.id}&select=status,slug`)).body as { status: string; slug: string }[];
    expect(publicRow).toEqual([{ status: 'published', slug: expect.stringMatching(/^anna-testova/) as unknown as string }]);

    await page.getByRole('button', { name: 'Скрыть из каталога' }).click();
    await expect(page.getByText('Анкета скрыта из каталога.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeEnabled();
    const after = (await guest.rpc('catalog')).body as { user_id: string }[];
    expect(after.some(t => t.user_id === tutor.id)).toBeFalsy();
    expect((await guest.get(`tutors?user_id=eq.${tutor.id}`)).body).toEqual([]);
  });
});
