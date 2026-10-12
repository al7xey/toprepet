import { expect, test, type Page } from '@playwright/test';
import { apiFreeSlots, bookPath, cleanBooking, publishedTutor, rest, signInStudent, type Account, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.use({ timezoneId: 'Europe/Moscow' });

const mskTime = (ts: number) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(ts);
const submit = (page: Page) => page.locator('button:visible', { hasText: 'Записаться' });
const doneId = (page: Page) => Number(/\/book\/(\d+)\/done/.exec(page.url())![1]);

test.describe('У3.3 + У4.1 запись в свободное время', () => {
  let tutors: PublishedTutor[] = [];
  let bookings: { student: Account; id: number }[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors, bookings });
    tutors = [];
    bookings = [];
  });

  test('У4.1 записываюсь для себя: «Заявка отправлена», ждёт подтверждения, слот пропал у других', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info);
    tutors = [tutor];
    const student = await signInStudent(page, request, info);
    const slot = (await apiFreeSlots(request, tutor.id))[8];
    await page.goto(bookPath(tutor, slot));
    await expect(page.getByRole('heading', { name: 'Оформление записи' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Для себя' })).toBeChecked();
    await expect(page.locator('.sum dl')).toContainText('Ирина');
    await expect(page.locator('.sum dl')).toContainText(mskTime(slot));
    await submit(page).click();

    await expect(page).toHaveURL(/\/book\/\d+\/done$/);
    const id = doneId(page);
    bookings = [{ student, id }];
    await expect(page.getByRole('heading', { name: /^Заявка отправлена / })).toBeVisible();
    await expect(page.getByText('Ждёт подтверждения')).toBeVisible();
    await expect(page.getByText(/подтверждает до/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Открыть занятие' })).toHaveAttribute('href', `/cabinet/lessons/${id}`);

    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,for_other,price_rub,starts_at`)).body as Row[])[0];
    expect(row).toMatchObject({ status: 'pending', for_other: false, price_rub: 2000 });
    expect(Date.parse(String(row.starts_at))).toBe(slot);
    expect(await apiFreeSlots(request, tutor.id)).not.toContain(slot);
  });

  test('У4.1 записываю другого человека: без имени и возраста не отправляется, потом «Миша, 14 лет»', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info);
    tutors = [tutor];
    const student = await signInStudent(page, request, info);
    const slot = (await apiFreeSlots(request, tutor.id))[10];
    await page.goto(bookPath(tutor, slot));
    await page.getByRole('radio', { name: 'Для другого человека' }).check();
    await submit(page).click();
    await expect(page.getByText('Напишите имя ученика.')).toBeVisible();
    await expect(page.getByText('Укажите возраст числом от 1 до 120.')).toBeVisible();
    await expect(page).toHaveURL(/\/book\/e2e-/);

    await page.getByLabel('Имя').fill('Миша');
    await page.getByLabel('Возраст').fill('14');
    await expect(page.locator('.sum dl')).toContainText('Миша, 14 лет');
    await submit(page).click();
    await expect(page).toHaveURL(/\/book\/\d+\/done$/);
    const id = doneId(page);
    bookings = [{ student, id }];
    await expect(page.getByText('Миша, 14 лет')).toBeVisible();
    const row = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,for_other,participant_name,participant_age`)).body as Row[])[0];
    expect(row).toEqual({ status: 'pending', for_other: true, participant_name: 'Миша', participant_age: 14 });
  });
});
