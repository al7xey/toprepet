import { expect, test } from '@playwright/test';
import {
  apiBook,
  apiConfirm,
  cleanAdmin,
  cleanBooking,
  createAdmin,
  createUser,
  dropProblems,
  finishBookings,
  HOUR,
  moveBooking,
  outboxTo,
  publishedTutor,
  rest,
  signInAdmin,
  slotAfter,
  sql,
  uniqueEmail,
  uniqueWord,
  type Account,
  type PublishedTutor,
} from './helpers';

/** «Ср 14 окт» by Moscow, as the queue shows a deadline. */
function day(ts: number) {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(ts);
  const part = (t: string) => (p.find(x => x.type === t)?.value ?? '').replace('.', '');
  const wd = part('weekday');
  return `${wd[0].toUpperCase()}${wd.slice(1)} ${part('day')} ${part('month')}`;
}

test.describe('А3 решение проблемы', () => {
  let admin: Account | undefined;
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    dropProblems(ids);
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    cleanAdmin(admin);
    tutors = [];
    ids = [];
  });

  test('А3 очередь с дедлайном, просроченные выделены; «Занятие состоялось» и «Занятие не состоялось», письма обеим сторонам', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { name: `Анна ${uniqueWord()}` });
    tutors = [tutor];
    const student = await createUser(request, { email: uniqueEmail('student', info), name: `Ольга ${uniqueWord()}` });
    const a = await apiBook(request, student, tutor, await slotAfter(request, tutor.id, 30 * HOUR));
    const b = await apiBook(request, student, tutor, await slotAfter(request, tutor.id, 60 * HOUR));
    ids = [a, b];
    for (const id of ids) await apiConfirm(request, tutor, id);
    moveBooking(a, Date.now() - 6 * HOUR);
    moveBooking(b, Date.now() - 3 * HOUR);
    for (const id of ids) {
      const res = await rest(request, student.token).rpc('report_problem', { p_id: id, p_kind: id === a ? 'technical' : 'no_show', p_text: 'Звонок не начался' });
      expect(res.ok, JSON.stringify(res.body)).toBeTruthy();
    }
    // the first one is past its deadline of 3 working days
    const overdue = Date.now() - 24 * HOUR;
    sql(`update problems set due_at = '${new Date(overdue).toISOString()}' where booking_id = ${a}`);
    const due = Date.parse(sql(`select to_char(due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from problems where booking_id = ${b}`));

    admin = await createAdmin(request, info);
    await signInAdmin(page, admin);
    await page.goto('/admin/disputes');
    await expect(page.getByRole('heading', { name: 'Проблемы' })).toBeVisible();
    const rowA = page.locator('.tbl tbody tr').filter({ hasText: `B-${a}` });
    const rowB = page.locator('.tbl tbody tr').filter({ hasText: `B-${b}` });
    await expect(rowA).toHaveClass(/hot/);
    await expect(rowA).toContainText(`Просрочено: ${day(overdue)}`);
    await expect(rowA).toContainText('Занятие не состоялось по технической причине');
    await expect(rowB).not.toHaveClass(/hot/);
    await expect(rowB).toContainText(day(due));
    await expect(rowB).toContainText('Репетитор не пришёл');
    // nearest deadline first
    const order = await page.locator('.tbl tbody tr').allTextContents();
    expect(order.findIndex(t => t.includes(`B-${a}`))).toBeLessThan(order.findIndex(t => t.includes(`B-${b}`)));

    // «Занятие не состоялось»: the comment is required and goes to both sides
    await rowB.getByRole('link', { name: `B-${b}` }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/disputes/${b}$`));
    await expect(page.getByText(`Решить до ${day(due)}`)).toBeVisible();
    await expect(page.getByText('Звонок не начался')).toBeVisible();
    await page.getByRole('button', { name: /Занятие не\sсостоялось/ }).click();
    await expect(page.getByText(/Напишите комментарий/)).toBeVisible();
    await page.getByLabel('Комментарий к решению').fill('Анна подтвердила, что не смогла подключиться.');
    await page.getByRole('button', { name: /Занятие не\sсостоялось/ }).click();
    await expect(page).toHaveURL(/\/admin\/disputes$/);
    await expect(page.getByText(`Решение по занятию B-${b} отправлено ученику и репетитору.`)).toBeVisible();
    await expect(rowB).toHaveCount(0);
    for (const who of [student.email, tutor.email]) {
      const letters = outboxTo(who, 'problem_resolved').filter(l => l.payload.booking_id === b);
      expect(letters, who).toHaveLength(1);
      expect(letters[0].payload).toMatchObject({ resolution: 'not_happened', comment: 'Анна подтвердила, что не смогла подключиться.' });
    }

    // «Занятие состоялось» on the overdue one closes the lesson
    await rowA.getByRole('link', { name: `B-${a}` }).click();
    await expect(page.getByText(`Просрочено: ${day(overdue)}`)).toBeVisible();
    await page.getByLabel('Комментарий к решению').fill('Репетитор прислал запись звонка.');
    await page.getByRole('button', { name: 'Занятие состоялось' }).click();
    await expect(page).toHaveURL(/\/admin\/disputes$/);
    await expect(rowA).toHaveCount(0);
    for (const who of [student.email, tutor.email]) {
      expect(outboxTo(who, 'problem_resolved').filter(l => l.payload.booking_id === a)[0].payload).toMatchObject({ resolution: 'happened' });
    }
    expect(sql(`select status from bookings where id = ${a}`)).toBe('completed');

    // a decided problem shows its decision and no buttons
    await page.goto(`/admin/disputes/${a}`);
    await expect(page.getByText('Решено', { exact: true })).toBeVisible();
    await expect(page.getByText('Репетитор прислал запись звонка.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Занятие состоялось' })).toHaveCount(0);
  });
});
