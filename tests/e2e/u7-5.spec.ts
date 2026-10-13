import { expect, test } from '@playwright/test';
import { cleanBooking, finishBookings, lessonFixture, moveBooking, outboxTo, rest, signInAs, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;
const DAY = 24 * 3_600_000;

/** 3 working days (Monday–Friday by Moscow) after a moment, as the support promises. */
function threeWorkingDays(from: number) {
  let d = from;
  let left = 3;
  while (left > 0) {
    d += DAY;
    const wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', weekday: 'short' }).format(d);
    if (wd !== 'Sat' && wd !== 'Sun') left--;
  }
  return d;
}

/** «Ср 14 окт» by Moscow. */
function day(ts: number) {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(ts);
  const part = (t: string) => (p.find(x => x.type === t)?.value ?? '').replace('.', '');
  const wd = part('weekday');
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${part('day')} ${part('month')}`;
}

test.describe('У7.5 сообщить о проблеме', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У7.5 форма «что случилось» и описание; после отправки «На рассмотрении» и срок 3 рабочих дня', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    moveBooking(id, Date.now() - 2 * 3_600_000);
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await page.getByRole('link', { name: /Сообщить о\sпроблеме/ }).click();
    await expect(page).toHaveURL(new RegExp(`/cabinet/lessons/${id}/problem$`));
    await expect(page.getByRole('heading', { name: 'Что случилось?' })).toBeVisible();
    const kinds = page.getByRole('radio');
    await expect(kinds).toHaveCount(3);
    await expect(page.getByRole('radio', { name: 'Репетитор не пришёл' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Занятие не состоялось по технической причине' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Другое' })).toBeVisible();

    await page.getByRole('button', { name: 'Отправить' }).click();
    await expect(page.getByText('Выберите, что случилось.')).toBeVisible();
    await page.getByText('Репетитор не пришёл').click();
    await page.getByLabel('Подробнее').fill('Ждали 20 минут, ссылка не открывалась');
    const sent = Date.now();
    await page.getByRole('button', { name: 'Отправить' }).click();

    await expect(page).toHaveURL(new RegExp(`/cabinet/lessons/${id}$`));
    await expect(page.getByText('На рассмотрении', { exact: true })).toBeVisible();
    await expect(page.getByText('Разбираемся')).toBeVisible();
    const due = threeWorkingDays(sent);
    await expect(page.getByText(/Ответ пришлём на/)).toContainText(`${student.email} до ${day(due)}`);
    await expect(page.getByText(/вы сообщили о\sпроблеме$/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Всё прошло хорошо' })).toHaveCount(0);

    const problem = ((await rest(request, student.token).get(`problems?booking_id=eq.${id}&select=kind,description,status,due_at`)).body as Row[])[0];
    expect(problem).toMatchObject({ kind: 'no_show', description: 'Ждали 20 минут, ссылка не открывалась', status: 'open' });
    expect(Math.abs(Date.parse(String(problem.due_at)) - due)).toBeLessThan(60_000);
    expect(outboxTo(tutor.email, 'problem_reported')).toHaveLength(1);

    // the form is gone once a problem exists
    await page.goto(`/cabinet/lessons/${id}/problem`);
    await expect(page).toHaveURL(new RegExp(`/cabinet/lessons/${id}$`));
    await page.goto('/cabinet/?tab=past');
    await expect(page.getByRole('list', { name: 'Прошедшие занятия' }).getByRole('link')).toContainText('На рассмотрении');
  });
});
