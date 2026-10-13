import { expect, test } from '@playwright/test';
import { cleanBooking, finishBookings, HOUR, lessonFixture, moveBooking, outboxTo, rest, signInAs, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.describe('У7.3-поздно поздняя отмена считается занятием', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У7.3-поздно до начала меньше 4 часов: предупреждение, что репетитор вправе считать занятие состоявшимся, отмена второй кнопкой', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    // the lesson now starts in 2 hours
    moveBooking(id, Date.now() + 2 * HOUR);
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(page.getByText('До начала меньше 4 часов.')).toBeVisible();

    await page.getByRole('button', { name: 'Отменить занятие' }).click();
    const dialog = page.getByRole('dialog', { name: 'До занятия меньше 4 часов' });
    await expect(dialog.getByText(/^Анна держала для вас это время и\sвправе считать занятие состоявшимся\. Если отменяете из-за форс-мажора, напишите ей\.$/)).toBeVisible();
    // the main button keeps the lesson
    const keep = dialog.getByRole('button', { name: 'Не отменять' });
    await expect(keep).toHaveClass(/\bp\b/);
    await keep.click();
    await expect(dialog).toBeHidden();
    expect(((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status`)).body as Row[])[0].status).toBe('confirmed');

    await page.getByRole('button', { name: 'Отменить занятие' }).click();
    await dialog.getByRole('button', { name: 'Всё равно отменить' }).click();
    await expect(page.getByText('Занятие отменено. Анна получила уведомление.')).toBeVisible();
    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,late_cancel`)).body as Row[])[0];
    expect(row).toEqual({ status: 'cancelled', late_cancel: true });
    expect(outboxTo(tutor.email, 'booking_cancelled')[0].payload).toMatchObject({ by: 'student', late: true });

    // the tutor sees the late flag on the lesson
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await signInAs(page, tutor, 'tutor');
    await page.goto(`/tutor/lessons/${id}`);
    await expect(page.getByText('Ирина отменила занятие')).toBeVisible();
    await expect(page.getByText(/Отмена меньше чем за\s4\sчаса: вы вправе считать занятие состоявшимся\./)).toBeVisible();
  });
});
