import { expect, test } from '@playwright/test';
import { cleanBooking, finishBookings, HOUR, hm, lessonFixture, moveBooking, rest, runJobs, signInAs, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.describe('У7.4 после занятия', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У7.4 после окончания видны «Всё прошло хорошо» и «Сообщить о проблеме»; «Всё прошло хорошо» закрывает занятие', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(page.getByText('Репетитор пришлёт ссылку перед началом')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Всё прошло хорошо' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Сообщить о\sпроблеме/ })).toHaveCount(0);

    // the lesson ended 30 minutes ago
    const start = Date.now() - 90 * 60_000;
    moveBooking(id, start);
    const end = start + HOUR;
    await page.goto('/cabinet/?tab=past');
    const card = page.getByRole('list', { name: 'Прошедшие занятия' }).getByRole('link');
    await expect(card).toContainText('Прошло');
    await expect(card).toContainText('Как прошло?');
    await card.click();
    await expect(page.getByText('Как прошло занятие?')).toBeVisible();
    // closes by itself 24 hours after the end, by Moscow time
    await expect(page.getByText(/занятие завершится само/)).toContainText(hm(end + 24 * HOUR, 'Europe/Moscow'));
    await expect(page.getByRole('link', { name: /Сообщить о\sпроблеме/ })).toHaveAttribute('href', `/cabinet/lessons/${id}/problem`);
    await page.getByRole('button', { name: 'Всё прошло хорошо' }).click();

    await expect(page.getByText('Спасибо! Занятие завершено.')).toBeVisible();
    await expect(page.getByText('Прошло', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Всё прошло хорошо' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Записаться к\sАнне ещё/ })).toHaveAttribute('href', `/teachers/${tutor.slug}/`);
    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,student_ok_at`)).body as Row[])[0];
    expect(row.status).toBe('completed');
    expect(row.student_ok_at).not.toBeNull();
  });

  test('У7.4 без действий занятие переходит в «Прошло» через 24 часа после окончания', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    const status = async () => ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status`)).body as Row[])[0].status;

    // ended 23 hours ago: still waiting for the student
    moveBooking(id, Date.now() - 24 * HOUR);
    runJobs();
    expect(await status()).toBe('confirmed');
    // ended 25 hours ago: the job closes it
    moveBooking(id, Date.now() - 26 * HOUR);
    runJobs();
    expect(await status()).toBe('completed');

    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(page.getByText('Прошло', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Всё прошло хорошо' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Сообщить о\sпроблеме/ })).toHaveCount(0);
    await page.goto('/cabinet/?tab=past');
    const card = page.getByRole('list', { name: 'Прошедшие занятия' }).getByRole('link');
    await expect(card).toContainText('Прошло');
    await expect(card).not.toContainText('Как прошло?');
  });
});
