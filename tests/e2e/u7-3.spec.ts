import { expect, test } from '@playwright/test';
import { apiFreeSlots, cleanBooking, finishBookings, HOUR, hm, lessonFixture, outboxTo, rest, signInAs, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.describe('У7.3-рано отмена не позднее чем за 4 часа', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У7.3-рано до начала больше 4 часов: статус «Отменено», слот снова свободен, репетитор получает письмо', async ({ page, request }, info) => {
    const { tutor, student, slot, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    // free until 4 hours before the start, by Moscow time
    await expect(page.getByText(/^Без последствий до /)).toContainText(hm(slot - 4 * HOUR, 'Europe/Moscow'));
    await page.getByRole('button', { name: 'Отменить занятие' }).click();
    const dialog = page.getByRole('dialog', { name: 'Отменить занятие?' });
    await expect(dialog.getByText(/^До начала больше 4\sчасов, отмена ни\sк\sчему не\sобязывает\. Анна получит письмо, время снова станет свободным\.$/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Отменить занятие' }).click();

    await expect(page.getByText('Занятие отменено. Анна получила уведомление.')).toBeVisible();
    await expect(page.getByText('Отменено', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Записаться на\sдругое время/ })).toHaveAttribute('href', `/teachers/${tutor.slug}/`);
    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,cancelled_by,late_cancel`)).body as Row[])[0];
    expect(row).toEqual({ status: 'cancelled', cancelled_by: 'student', late_cancel: false });
    expect(await apiFreeSlots(request, tutor.id)).toContain(slot);
    const letters = outboxTo(tutor.email, 'booking_cancelled');
    expect(letters).toHaveLength(1);
    expect(letters[0].payload).toMatchObject({ by: 'student', late: false });
  });
});
