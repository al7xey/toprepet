import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  apiBook,
  apiFreeSlots,
  cleanBooking,
  createUser,
  finishBookings,
  HOUR,
  hm,
  logInInForm,
  moveBooking,
  outboxTo,
  publishedTutor,
  rest,
  runJobs,
  slotAfter,
  uniqueEmail,
  uniqueWord,
  type Account,
  type PublishedTutor,
} from './helpers';

type Row = Record<string, string | number | boolean | null>;

async function signIn(page: Page, email: string, home: RegExp) {
  await page.goto('/login/');
  await logInInForm(page, email);
  await expect(page).toHaveURL(home);
}

async function deadlineOf(request: APIRequestContext, student: Account, id: number) {
  const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=confirm_deadline,created_at,starts_at`)).body as Row[])[0];
  return { deadline: Date.parse(String(row.confirm_deadline)), created: Date.parse(String(row.created_at)), starts: Date.parse(String(row.starts_at)) };
}

/* У5.2: tutor in Yekaterinburg (UTC+5), student in Moscow. */
test.describe('У5.2 запись без ответа отменяется сама', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У5.2 срок решения: 24 часа с создания, но не позже чем за 2 часа до начала; оба видят его в своём поясе', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { name: `Анна ${uniqueWord()}`, tz: 'Asia/Yekaterinburg' });
    tutors = [tutor];
    const student = await createUser(request, { email: uniqueEmail('student', info), name: 'Ирина' });
    const far = await slotAfter(request, tutor.id, 30 * HOUR);
    // the first free start (12 h minimum lead, windows 09–21 every day) is always less than 26 h away
    const near = (await apiFreeSlots(request, tutor.id))[0];
    expect(near - Date.now()).toBeLessThan(26 * HOUR);
    const farId = await apiBook(request, student, tutor, far);
    const nearId = await apiBook(request, student, tutor, near);
    ids = [farId, nearId];

    const a = await deadlineOf(request, student, farId);
    expect(a.deadline - a.created).toBe(24 * HOUR);
    const b = await deadlineOf(request, student, nearId);
    expect(b.deadline).toBe(Math.min(b.created + 24 * HOUR, b.starts - 2 * HOUR));
    expect(b.deadline).toBeLessThan(b.created + 24 * HOUR);

    // the student sees the deadline by Moscow time
    await signIn(page, student.email, /\/cabinet\/$/);
    await page.goto(`/cabinet/lessons/${nearId}`);
    await expect(page.getByText(/^Ждём ответа/)).toContainText(hm(b.deadline, 'Europe/Moscow'));
    await page.goto(`/book/${nearId}/done`);
    await expect(page.getByText(/подтверждает до\s/)).toContainText(hm(b.deadline, 'Europe/Moscow'));

    // the tutor by Yekaterinburg time, two hours later on the clock
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await signIn(page, tutor.email, /\/tutor\/$/);
    await page.goto(`/tutor/bookings/${nearId}`);
    await expect(page.getByText(/Если не\sответить до/)).toContainText(hm(b.deadline, 'Asia/Yekaterinburg'));
    expect(hm(b.deadline, 'Asia/Yekaterinburg')).not.toBe(hm(b.deadline, 'Europe/Moscow'));
  });

  test('У5.2 срок прошёл без ответа: статус «Отменено», слот свободен, письма обоим', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { name: `Анна ${uniqueWord()}`, tz: 'Asia/Yekaterinburg' });
    tutors = [tutor];
    const student = await createUser(request, { email: uniqueEmail('student', info), name: 'Ирина' });
    const slot = await slotAfter(request, tutor.id, 30 * HOUR);
    const id = await apiBook(request, student, tutor, slot);
    ids = [id];
    expect(await apiFreeSlots(request, tutor.id)).not.toContain(slot);

    // the deadline passes a minute ago; the cron job runs
    moveBooking(id, slot, { deadline: Date.now() - 60_000 });
    expect(runJobs().cancelled).toBeGreaterThanOrEqual(1);

    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,cancelled_by`)).body as Row[])[0];
    expect(row).toEqual({ status: 'cancelled', cancelled_by: 'system' });
    expect(await apiFreeSlots(request, tutor.id)).toContain(slot);
    expect(outboxTo(student.email, 'booking_autocancelled')).toHaveLength(1);
    expect(outboxTo(tutor.email, 'booking_autocancelled')).toHaveLength(1);
    // the tutor cannot confirm it any more
    expect((await rest(request, tutor.token).rpc('confirm_booking', { p_id: id })).ok).toBeFalsy();

    await signIn(page, student.email, /\/cabinet\/$/);
    const card = page.getByRole('list', { name: 'Ближайшие занятия' }).getByRole('link');
    await expect(card).toContainText('Отменено');
    await card.click();
    await expect(page.getByText(/не\sответила вовремя$/)).toBeVisible();
    await expect(page.getByText(/^Запись на\s.+ отменена автоматически\. Выберите другое время\.$/)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Записаться на другое время' }).getByRole('link').first()).toBeVisible();
  });
});
