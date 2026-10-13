import { expect, test } from '@playwright/test';
import { apiFreeSlots, cleanBooking, finishBookings, lessonFixture, outboxTo, rest, signInAs, sql, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.describe('Р6.2 репетитор отменяет занятие', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('Р6.2 отмена в любое время с причиной; ученик получает письмо и видит причину', async ({ page, request }, info) => {
    const { tutor, student, slot, id } = await lessonFixture(request, info, { forOther: { name: 'Миша', age: 14 } });
    tutors = [tutor];
    ids = [id];
    await signInAs(page, tutor, 'tutor');
    await page.goto(`/tutor/lessons/${id}`);
    await page.getByRole('button', { name: 'Отменить занятие' }).click();
    const dialog = page.getByRole('dialog', { name: 'Отменить занятие с Мишей?' });
    await expect(dialog.getByText('Ирине придёт письмо с вашей причиной и предложением выбрать другое время.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Отменить занятие' }).click();
    await expect(dialog.getByText('Напишите причину: её увидит ученик.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Не отменять' }).click();
    await expect(dialog).toBeHidden();
    expect(((await rest(request, tutor.token).get(`bookings?id=eq.${id}&select=status`)).body as Row[])[0].status).toBe('confirmed');

    await page.getByRole('button', { name: 'Отменить занятие' }).click();
    await dialog.getByLabel('Причина').fill('Заболела, перенесём на следующую неделю');
    await dialog.getByRole('button', { name: 'Отменить занятие' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Занятие отменено. Ирине ушло письмо.')).toBeVisible();
    await expect(page.getByText('Вы отменили занятие')).toBeVisible();
    await expect(page.getByText('Причина: «Заболела, перенесём на следующую неделю»')).toBeVisible();

    const row = ((await rest(request, tutor.token).get(`bookings?id=eq.${id}&select=status,cancelled_by,cancel_reason,late_cancel`)).body as Row[])[0];
    expect(row).toEqual({ status: 'cancelled', cancelled_by: 'tutor', cancel_reason: 'Заболела, перенесём на следующую неделю', late_cancel: false });
    const letters = outboxTo(student.email, 'booking_cancelled');
    expect(letters).toHaveLength(1);
    expect(letters[0].payload).toMatchObject({ by: 'tutor', reason: 'Заболела, перенесём на следующую неделю' });
    expect(await apiFreeSlots(request, tutor.id)).toContain(slot);

    // the student's card
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(page.getByText(/^Анна отменила занятие$/)).toBeVisible();
    await expect(page.getByText('Причина: «Заболела, перенесём на следующую неделю». Выберите другое время.')).toBeVisible();
  });

  test('Р6.2 отмена учитывается в истории для админки, публично не показывается', async ({ page, request }, info) => {
    const { tutor, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    expect((await rest(request, tutor.token).rpc('cancel_booking', { p_id: id, p_reason: 'Не смогу' })).ok).toBeTruthy();
    const events = JSON.parse(sql(`select json_agg(json_build_object('to', to_status, 'note', note, 'actor', actor_id) order by id) from booking_events where booking_id = ${id}`)) as {
      to: string;
      note: string | null;
      actor: string;
    }[];
    expect(events.at(-1)).toEqual({ to: 'cancelled', note: 'Не смогу', actor: tutor.id });

    // the public profile and the catalog say nothing about it
    await page.goto(`/teachers/${tutor.slug}/`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Анна');
    await expect(page.locator('main')).not.toContainText(/отмен/i);
    expect((await rest(request).get(`bookings?id=eq.${id}&select=id`)).body).toEqual([]);
  });
});
