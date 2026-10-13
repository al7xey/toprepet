import { expect, test } from '@playwright/test';
import { cleanBooking, fact, finishBookings, hm, lessonFixture, moveBooking, outboxTo, rest, runJobs, signInAs, type PublishedTutor } from './helpers';

type Row = Record<string, string | number | boolean | null>;

test.describe('Р6.1 ссылка на звонок к занятию', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('Р6.1 принимается только адрес на http или https, иначе текст ошибки; ученику уходит письмо', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info, { forOther: { name: 'Миша', age: 14 } });
    tutors = [tutor];
    ids = [id];
    await signInAs(page, tutor, 'tutor');
    await page.goto('/tutor/lessons/');
    const row = page.getByRole('list', { name: 'Ближайшие занятия' }).getByRole('link');
    await expect(row).toContainText('Миша, 14 лет · Математика');
    await expect(row).toContainText('Нет ссылки');
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/tutor/lessons/${id}$`));
    await expect(page.getByRole('heading', { name: 'Миша, математика' })).toBeVisible();

    const field = page.getByLabel('Ссылка на звонок');
    const save = page.getByRole('button', { name: 'Сохранить ссылку' });
    await save.click();
    await expect(page.getByText('Вставьте ссылку на звонок.')).toBeVisible();
    for (const bad of ['telemost.yandex.ru/j/4471', 'ftp://files.example.com/x', 'https://']) {
      await field.fill(bad);
      await save.click();
      await expect(page.getByText(/^Ссылка должна начинаться с http:\/\/ или https:\/\//)).toBeVisible();
    }
    expect(((await rest(request, tutor.token).get(`bookings?id=eq.${id}&select=meeting_url`)).body as Row[])[0].meeting_url).toBeNull();
    // the database refuses the same addresses on its own
    expect((await rest(request, tutor.token).rpc('set_meeting_url', { p_id: id, p_url: 'telemost.yandex.ru/j/4471' })).body).toMatchObject({ message: 'bad_url' });

    await field.fill('https://telemost.yandex.ru/j/4471');
    await save.click();
    await expect(page.getByText('Ссылка сохранена, Ирине ушло письмо.')).toBeVisible();
    await expect(fact(page, 'Ссылка')).toHaveText('telemost.yandex.ru/j/4471');
    await expect(page.getByText('Подтверждено', { exact: true })).toBeVisible();
    expect(((await rest(request, tutor.token).get(`bookings?id=eq.${id}&select=meeting_url`)).body as Row[])[0].meeting_url).toBe(
      'https://telemost.yandex.ru/j/4471',
    );
    expect(outboxTo(student.email, 'link_added')).toHaveLength(1);

    // the link can be changed before the start
    await page.getByRole('button', { name: 'Изменить ссылку' }).click();
    await expect(page.getByLabel('Ссылка на звонок')).toHaveValue('https://telemost.yandex.ru/j/4471');
  });

  test('Р6.1 за 15 минут до начала ссылки нет — приходит напоминание; сводка предупреждает заранее', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    const other = await lessonFixture(request, info);
    tutors = [tutor, other.tutor];
    ids = [id, other.id];
    // the same lesson with a link gets no reminder
    expect((await rest(request, other.tutor.token).rpc('set_meeting_url', { p_id: other.id, p_url: 'https://meet.example.com/a' })).ok).toBeTruthy();

    // 20 minutes before: not yet; the summary already warns (less than 24 hours)
    const start = Date.now() + 20 * 60_000;
    moveBooking(id, start);
    moveBooking(other.id, start);
    runJobs();
    expect(outboxTo(tutor.email, 'link_missing')).toHaveLength(0);
    await signInAs(page, tutor, 'tutor');
    const warnings = page.getByRole('region', { name: 'Предупреждения' });
    await expect(warnings.getByText('Нет ссылки на занятие')).toBeVisible();
    await expect(warnings).toContainText(hm(start, 'Asia/Yekaterinburg'));
    await expect(warnings.getByRole('link', { name: 'Добавить ссылку' })).toHaveAttribute('href', `/tutor/lessons/${id}`);

    // 10 minutes before
    moveBooking(id, Date.now() + 10 * 60_000);
    moveBooking(other.id, Date.now() + 10 * 60_000);
    runJobs();
    const letters = outboxTo(tutor.email, 'link_missing');
    expect(letters).toHaveLength(1);
    expect(outboxTo(other.tutor.email, 'link_missing')).toHaveLength(0);
    expect(outboxTo(student.email, 'link_missing')).toHaveLength(0);
    runJobs();
    expect(outboxTo(tutor.email, 'link_missing')).toHaveLength(1);

    await page.goto('/cabinet/notifications/');
    await expect(page.getByRole('list', { name: 'Уведомления' })).toContainText(/Добавьте ссылку на занятие в \d\d:\d\d/);
  });
});
