import { expect, test } from '@playwright/test';
import { apiBook, apiFreeSlots, bookPath, cleanBooking, createUser, publishedTutor, rest, signInStudent, uniqueEmail, type Account, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.use({ timezoneId: 'Europe/Moscow' });

test.describe('У4.1-занят двое выбрали одно время', () => {
  let tutors: PublishedTutor[] = [];
  let bookings: { student: Account; id: number }[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors, bookings });
    tutors = [];
    bookings = [];
  });

  test('У4.1-занят второй ученик видит «Слот … уже занят» и три ближайших свободных, выбирает и записывается', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info);
    tutors = [tutor];
    const a = await signInStudent(page, request, info, 'Ирина');
    const b = await createUser(request, { email: uniqueEmail('rival', info), name: 'Пётр' });
    const slot = (await apiFreeSlots(request, tutor.id))[8];

    await page.goto(bookPath(tutor, slot));
    const submit = page.locator('button:visible', { hasText: 'Записаться' });
    await expect(submit).toBeEnabled();
    bookings.push({ student: b, id: await apiBook(request, b, tutor, slot) });

    await submit.click();
    const alert = page.getByRole('alert').filter({ hasText: 'уже занят' });
    await expect(alert).toContainText(/Слот .+ уже занят/);
    await expect(alert).toContainText('Его только что выбрал другой ученик. Ближайшие свободные:');
    const nearest = page.getByRole('group', { name: 'Ближайшие свободные' }).getByRole('button');
    await expect(nearest).toHaveCount(3);
    await expect(submit).toBeDisabled();

    await nearest.first().click();
    await expect(alert).toHaveCount(0);
    const picked = Date.parse(new URL(page.url()).searchParams.get('slot')!);
    expect(picked).not.toBe(slot);
    await submit.click();
    await expect(page).toHaveURL(/\/book\/\d+\/done$/);
    const id = Number(/\/book\/(\d+)\/done/.exec(page.url())![1]);
    bookings.push({ student: a, id });
    const row = ((await rest(request, a.token).get(`bookings?id=eq.${id}&select=starts_at,status`)).body as Row[])[0];
    expect(Date.parse(String(row.starts_at))).toBe(picked);
    expect(row.status).toBe('pending');
  });
});
