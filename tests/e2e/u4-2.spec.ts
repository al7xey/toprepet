import { expect, test } from '@playwright/test';
import { apiFreeSlots, bookPath, cleanBooking, publishedTutor, rest, signInStudent, type Account, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.use({ timezoneId: 'Europe/Moscow' });

test.describe('У4.2 одна сумма без наценок, оплата напрямую', () => {
  let tutors: PublishedTutor[] = [];
  let bookings: { student: Account; id: number }[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors, bookings });
    tutors = [];
    bookings = [];
  });

  test('У4.2 в записи одна сумма, равная цене репетитора, и строка про оплату напрямую', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { subjects: [{ slug: 'math', prices: { 60: 2000, 90: 2900 } }] });
    tutors = [tutor];
    const student = await signInStudent(page, request, info);
    const slot = (await apiFreeSlots(request, tutor.id))[8];
    await page.goto(bookPath(tutor, slot));
    await expect(page.getByTestId('total')).toHaveText('2 000 ₽');
    const sum = page.locator('.sum');
    expect(((await sum.innerText()).match(/₽/g) ?? []).length).toBe(1);
    await expect(sum).not.toContainText(/комисси|сбор|итого/i);
    await expect(page.getByText(/Оплата репетитору напрямую после подтверждения/)).toBeVisible();

    await page.locator('button:visible', { hasText: 'Записаться' }).click();
    await expect(page).toHaveURL(/\/book\/\d+\/done$/);
    const id = Number(/\/book\/(\d+)\/done/.exec(page.url())![1]);
    bookings = [{ student, id }];
    await expect(page.getByText('2 000 ₽')).toBeVisible();
    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=price_rub`)).body as Row[])[0];
    expect(row.price_rub).toBe(2000);
  });
});
