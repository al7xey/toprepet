import { expect, test } from '@playwright/test';
import { apiBook, apiFreeSlots, cleanBooking, publishedTutor, rest, signInStudent, type Account, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.use({ timezoneId: 'Europe/Moscow' });

const mskTime = (ts: number) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(ts);

test.describe('У4.3 «Мои занятия»: список, статусы, отмена заявки', () => {
  let tutors: PublishedTutor[] = [];
  let bookings: { student: Account; id: number }[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors, bookings });
    tutors = [];
    bookings = [];
  });

  test('У4.3 пока занятий нет: пустое состояние с поиском репетитора', async ({ page, request }, info) => {
    await signInStudent(page, request, info);
    await expect(page.getByText('Здесь появятся ваши занятия')).toBeVisible();
    await page.getByRole('link', { name: 'Найти репетитора' }).click();
    await expect(page).toHaveURL(/\/teachers\/$/);
  });

  test('У4.3 ближайшие по времени со статусами; прошедшие отдельно с «Прошло»', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info);
    tutors = [tutor];
    const student = await signInStudent(page, request, info);
    const free = await apiFreeSlots(request, tutor.id);
    const starts = [free[10], free[4], free[8], free[6]];
    const ids: number[] = [];
    for (const s of starts) ids.push(await apiBook(request, student, tutor, s));
    bookings = ids.map(id => ({ student, id }));
    // starts ascending: free[4] pending, free[6] confirmed, free[8] declined, free[10] cancelled
    expect((await rest(request, tutor.token).rpc('confirm_booking', { p_id: ids[3] })).ok).toBeTruthy();
    expect((await rest(request, tutor.token).rpc('decline_booking', { p_id: ids[2], p_reason: 'Не получится в это время' })).ok).toBeTruthy();
    expect((await rest(request, student.token).rpc('cancel_booking', { p_id: ids[0] })).ok).toBeTruthy();

    await page.reload();
    const list = page.getByRole('list', { name: 'Ближайшие занятия' }).getByRole('link');
    await expect(list).toHaveCount(4);
    await expect(list.nth(0)).toContainText(mskTime(free[4]));
    await expect(list.nth(0)).toContainText('Ждёт подтверждения');
    await expect(list.nth(1)).toContainText('Подтверждено');
    await expect(list.nth(2)).toContainText('Отклонено');
    await expect(list.nth(3)).toContainText('Отменено');
    await expect(list.nth(0)).toContainText(`${tutor.name} · Математика`);

    await page.getByRole('link', { name: 'Прошедшие' }).click();
    await expect(page).toHaveURL(/tab=past/);
    await expect(page.getByText('Прошедших занятий пока нет')).toBeVisible();

    // a day after the confirmed lesson: it moves to «Прошедшие» as «Прошло»
    await page.clock.setFixedTime(free[6] + 26 * 3_600_000);
    await page.goto('/cabinet/?tab=past');
    const past = page.getByRole('list', { name: 'Прошедшие занятия' }).getByRole('link');
    await expect(past.filter({ hasText: mskTime(free[6]) })).toContainText('Прошло');
  });

  test('У4.3 отменяю заявку, которая ждёт подтверждения: подтверждение, тост, статус «Отменено»', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info);
    tutors = [tutor];
    const student = await signInStudent(page, request, info);
    const slot = (await apiFreeSlots(request, tutor.id))[8];
    const id = await apiBook(request, student, tutor, slot);
    bookings = [{ student, id }];

    await page.reload();
    await page.getByRole('list', { name: 'Ближайшие занятия' }).getByRole('link').first().click();
    await expect(page).toHaveURL(new RegExp(`/cabinet/lessons/${id}$`));
    await expect(page.getByText(/^Ждём ответа/)).toBeVisible();
    await page.getByRole('button', { name: 'Отменить запись' }).click();
    const dialog = page.getByRole('dialog', { name: 'Отменить запись?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Не отменять' }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Отменить запись' }).click();
    await dialog.getByRole('button', { name: 'Отменить запись' }).click();

    await expect(page).toHaveURL(/\/cabinet\/$/);
    await expect(page.getByText(/^Запись отменена\. .+ получит уведомление\.$/)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Ближайшие занятия' }).getByRole('link').first()).toContainText('Отменено');
    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,cancelled_by`)).body as Row[])[0];
    expect(row).toEqual({ status: 'cancelled', cancelled_by: 'student' });
    expect(await apiFreeSlots(request, tutor.id)).toContain(slot);
  });
});
