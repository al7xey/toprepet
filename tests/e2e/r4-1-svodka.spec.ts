import { expect, test } from '@playwright/test';
import { cleanUp, rest, seedReadyTutor, seedWindows, signInNewTutor, type Account } from './helpers';

test.describe('Р4.1-сводка', () => {
  let published: Account | undefined;
  test.afterEach(async ({ request }) => {
    if (published) await cleanUp(request, { tutor: published });
    published = undefined;
  });

  test('Р4.1-сводка новый репетитор видит предупреждения «не опубликована» и «нет свободных окон», записей и занятий пока нет', async ({ page, request }, info) => {
    await signInNewTutor(page, request, info);
    const warnings = page.getByRole('region', { name: 'Предупреждения' });
    await expect(warnings.getByText('Не опубликована')).toBeVisible();
    await expect(warnings.getByText('Нет свободных окон')).toBeVisible();
    await expect(warnings.getByRole('link', { name: 'Заполнить анкету' })).toHaveAttribute('href', '/tutor/profile/');
    await expect(warnings.getByRole('link', { name: 'Открыть расписание' })).toHaveAttribute('href', '/tutor/schedule/');
    await expect(page.getByRole('region', { name: 'Новые записи' })).toContainText('Новых записей нет');
    await expect(page.getByRole('region', { name: 'Ближайшие занятия' })).toContainText('Ближайших занятий нет');
  });

  test('Р4.1-сводка предупреждения пропадают, когда появляются окна и анкета опубликована', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    await seedReadyTutor(request, tutor, { windows: false });
    await page.reload();
    const warnings = page.getByRole('region', { name: 'Предупреждения' });
    await expect(warnings.getByText('Нет свободных окон')).toBeVisible();
    await expect(warnings.getByRole('listitem')).toHaveText([
      'Фото — готово',
      'Имя — готово',
      'Предмет с ценой — готово',
      'Свободное время в расписании — не хватает',
    ]);

    await seedWindows(request, tutor);
    await page.reload();
    await expect(warnings.getByText('Не опубликована')).toBeVisible();
    await expect(warnings.getByText('Нет свободных окон')).toHaveCount(0);
    await expect(warnings.getByRole('link', { name: 'Опубликовать анкету' })).toBeVisible();

    published = tutor;
    expect((await rest(request, tutor.token).rpc('publish_tutor')).ok).toBeTruthy();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Здравствуйте, Анна' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Предупреждения' })).toHaveCount(0);
    await expect(page.getByText('Опубликована', { exact: true })).toBeVisible();
  });

  test('Р4.1-сводка окна есть, но короче занятия: предупреждение «нет свободных окон» остаётся', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    await seedReadyTutor(request, tutor, { windows: false });
    const rows = [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ tutor_id: tutor.id, weekday, start_min: 600, end_min: 630 }));
    expect((await rest(request, tutor.token).post('weekly_windows', rows)).ok).toBeTruthy();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Предупреждения' }).getByText('Нет свободных окон')).toBeVisible();
  });
});
