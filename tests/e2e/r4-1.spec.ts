import { expect, test } from '@playwright/test';
import {
  apiBook,
  cleanBooking,
  createUser,
  fact,
  finishBookings,
  HOUR,
  hm,
  logInInForm,
  outboxTo,
  publishedTutor,
  rest,
  slotAfter,
  uniqueEmail,
  uniqueWord,
  type Account,
  type PublishedTutor,
} from './helpers';

type Row = Record<string, string | number | boolean | null>;


/* Р4.1: the tutor (Yekaterinburg, UTC+5) answers a booking a student in Moscow made for her son. */
test.describe('Р4.1 репетитор подтверждает или отклоняет запись', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  async function setup(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext, info: import('@playwright/test').TestInfo) {
    const tutor = await publishedTutor(request, info, { name: `Анна ${uniqueWord()}`, tz: 'Asia/Yekaterinburg' });
    tutors = [tutor];
    const student = await createUser(request, { email: uniqueEmail('student', info), name: 'Ирина' });
    const slot = await slotAfter(request, tutor.id, 30 * HOUR);
    const id = await apiBook(request, student, tutor, slot, { forOther: { name: 'Миша', age: 14 } });
    ids = [id];
    await page.goto('/login/');
    await logInInForm(page, tutor.email);
    await expect(page).toHaveURL(/\/tutor\/$/);
    return { tutor, student, slot, id };
  }

  test('Р4.1 в карточке записи имя и возраст ученика, предмет, время в моём поясе, цена и таймер до автоотмены; подтверждаю', async ({ page, request }, info) => {
    const { student, slot, id } = await setup(page, request, info);

    // the summary and the menu show the booking waiting for an answer
    const fresh = page.getByRole('list', { name: 'Ждут ответа' }).getByRole('link');
    await expect(fresh).toHaveCount(1);
    await expect(fresh).toContainText('Миша, 14 лет · Математика, 60 мин · 2 000 ₽');
    await expect(fresh).toContainText(/Ответьте за 2[34]\sч/);

    await page.goto('/tutor/bookings/');
    await expect(page.getByRole('link', { name: 'Ждут решения · 1' })).toBeVisible();
    const row = page.getByRole('list', { name: 'Ждут решения' }).getByRole('link');
    await expect(row).toContainText(hm(slot, 'Asia/Yekaterinburg'));
    await expect(row).toContainText(/Ответьте до (Пн|Вт|Ср|Чт|Пт|Сб|Вс) \d\d:\d\d/);
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/tutor/bookings/${id}$`));

    await expect(page.getByRole('heading', { name: 'Новая запись' })).toBeVisible();
    await expect(page.getByText('Миша, 14 лет', { exact: true })).toBeVisible();
    await expect(page.getByText(`Записала Ирина, ${student.email}`)).toBeVisible();
    // time in the tutor's zone (UTC+5) and the student's Moscow time next to it
    const when = fact(page, 'Когда');
    await expect(when).toContainText(`${hm(slot, 'Asia/Yekaterinburg')}–${hm(slot + HOUR, 'Asia/Yekaterinburg')}`);
    await expect(fact(page, 'У ученика')).toHaveText(`${hm(slot, 'Europe/Moscow')} по Москве`);
    expect(Number(hm(slot, 'Asia/Yekaterinburg').slice(0, 2)) - Number(hm(slot, 'Europe/Moscow').slice(0, 2))).toBe(2);
    await expect(fact(page, 'Предмет')).toHaveText('Математика, 60 мин');
    await expect(fact(page, 'Стоимость')).toHaveText('2 000 ₽');
    // created a moment ago: 24 hours to answer
    await expect(page.getByText(/^Осталось 2[34]\sч$/)).toBeVisible();
    await expect(page.getByText(/Если не\sответить до\s.+, запись отменится сама/)).toBeVisible();

    await page.getByRole('button', { name: 'Подтвердить' }).filter({ visible: true }).click();
    await expect(page).toHaveURL(new RegExp(`/tutor/lessons/${id}$`));
    await expect(page.getByText('Запись подтверждена. Ирине ушло письмо.')).toBeVisible();
    await expect(page.getByText('Нет ссылки', { exact: true })).toBeVisible();
    const db = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status`)).body as Row[])[0];
    expect(db.status).toBe('confirmed');
    expect(outboxTo(student.email, 'booking_confirmed')).toHaveLength(1);
  });

  test('Р4.1 отклонение требует причину; ученик получает письмо с причиной и видит её в карточке', async ({ page, request }, info) => {
    const { student, id } = await setup(page, request, info);
    await page.goto(`/tutor/bookings/${id}`);
    await page.getByRole('button', { name: 'Отклонить' }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Почему не получится?' });
    await expect(dialog.getByText('Ирине придёт письмо с причиной.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Отклонить запись' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Выберите причину.');
    await dialog.getByText('Другое').click();
    await dialog.getByRole('button', { name: 'Отклонить запись' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Напишите причину: её увидит ученик.');
    await dialog.getByText('Это время уже занято').click();
    await dialog.getByRole('button', { name: 'Отклонить запись' }).click();

    await expect(page).toHaveURL(/\/tutor\/bookings\/$/);
    await expect(page.getByText('Запись отклонена. Ирине ушло письмо с причиной.')).toBeVisible();
    await expect(page.getByText('Новых записей нет')).toBeVisible();
    await page.getByRole('link', { name: 'Отклонённые' }).click();
    await expect(page.getByRole('list', { name: 'Отклонённые' }).getByRole('link')).toContainText('Отклонено');

    const db = ((await rest(request, student.token).get(`bookings?id=eq.${id}&select=status,decline_reason`)).body as Row[])[0];
    expect(db).toEqual({ status: 'declined', decline_reason: 'Это время уже занято' });
    const letters = outboxTo(student.email, 'booking_declined');
    expect(letters).toHaveLength(1);
    expect(letters[0].payload.reason).toBe('Это время уже занято');
  });
});

test('Р4.1 ученик видит отказ с причиной и другое время этого репетитора', async ({ page, request }, info) => {
  const tutor = await publishedTutor(request, info, { name: `Дмитрий ${uniqueWord()}` });
  const student: Account = await createUser(request, { email: uniqueEmail('student', info), name: 'Ирина' });
  const slot = await slotAfter(request, tutor.id, 30 * HOUR);
  const id = await apiBook(request, student, tutor, slot);
  try {
    expect((await rest(request, tutor.token).rpc('decline_booking', { p_id: id, p_reason: 'Это время уже занято' })).ok).toBeTruthy();
    await page.goto('/login/');
    await logInInForm(page, student.email);
    await expect(page).toHaveURL(/\/cabinet\/$/);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(page.getByText('Отклонено', { exact: true })).toBeVisible();
    await expect(page.getByText('Дмитрий не сможет провести занятие')).toBeVisible();
    await expect(page.getByText('Причина: «Это время уже занято». Выберите другое время или другого репетитора.')).toBeVisible();
    const slots = page.getByRole('region', { name: 'Свободное время Дмитрия' }).getByRole('link');
    await expect(slots).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Другие репетиторы по математике' })).toHaveAttribute('href', '/teachers/?subject=math');
    await slots.first().click();
    await expect(page).toHaveURL(new RegExp(`/book/${tutor.slug}\\?subject=math&dur=60&slot=`));
  } finally {
    await cleanBooking(request, { tutors: [tutor] });
  }
});
