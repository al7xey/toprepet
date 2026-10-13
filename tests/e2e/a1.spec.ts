import { expect, test, type Page } from '@playwright/test';
import {
  ANON_KEY,
  cleanAdmin,
  cleanBooking,
  createAdmin,
  createUser,
  logInInForm,
  PASSWORD,
  publishedTutor,
  rest,
  signInAdmin,
  sql,
  SUPABASE_URL,
  uniqueEmail,
  uniqueWord,
  type Account,
  type PublishedTutor,
} from './helpers';

/** «13 окт» of today by Moscow, as the journal dates an entry. */
const today = () => {
  const p = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short' }).formatToParts(Date.now());
  return `${p.find(x => x.type === 'day')?.value} ${(p.find(x => x.type === 'month')?.value ?? '').replace('.', '')}`;
};

async function findUser(page: Page, text: string) {
  const search = page.getByLabel('Имя или email');
  await search.fill(text);
  await search.press('Enter');
  const rows = page.locator('.tbl tbody tr');
  await expect(rows).toHaveCount(1);
  return rows.first();
}

async function act(page: Page, name: string, action: string, reason: string) {
  await page.getByRole('button', { name: `Действия: ${name}` }).click();
  const dialog = page.getByRole('dialog', { name });
  await dialog.getByText(action, { exact: true }).click();
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect(dialog.getByText('Напишите причину: она попадёт в журнал.')).toBeVisible();
  await dialog.getByLabel('Причина').fill(reason);
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect(dialog).toBeHidden();
}

test.describe('А1 скрыть анкету и заблокировать аккаунт', () => {
  let admin: Account | undefined;
  let tutors: PublishedTutor[] = [];
  let blocked: Account | undefined;
  test.afterEach(async ({ request }) => {
    if (blocked) sql(`update profiles set blocked_at = null, blocked_reason = null where id = '${blocked.id}'`);
    for (const t of tutors) sql(`update tutors set status = 'draft', hidden_reason = null where user_id = '${t.id}' and status = 'hidden'`);
    await cleanBooking(request, { tutors });
    cleanAdmin(admin);
    tutors = [];
    blocked = undefined;
  });

  test('А1 действие требует причину и попадает в журнал с датой и автором; скрытая анкета уходит из каталога, заблокированный не входит', async ({ page, request, browser }, info) => {
    const tutorName = `Павел ${uniqueWord()}`;
    const tutor = await publishedTutor(request, info, { name: tutorName });
    tutors = [tutor];
    const studentName = `Ирина ${uniqueWord()}`;
    const student = await createUser(request, { email: uniqueEmail('student', info), name: studentName });
    blocked = student;
    admin = await createAdmin(request, info, 'Светлана');
    await signInAdmin(page, admin);
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Пользователи' })).toBeVisible();

    // hide the tutor's profile
    let row = await findUser(page, tutorName);
    await expect(row).toContainText('репетитор');
    await expect(row).toContainText(tutor.email);
    await expect(row.getByText('Опубликована')).toBeVisible();
    await act(page, tutorName, 'Скрыть анкету из каталога', 'Фото не соответствует правилам');
    await expect(page.getByText('Анкета скрыта из каталога. Запись в журнале.')).toBeVisible();
    await expect(row.getByText('Скрыта')).toBeVisible();
    const journal = page.getByRole('region', { name: 'Журнал' });
    await expect(journal.getByText(`Светлана скрыла анкету: ${tutorName}: «Фото не соответствует правилам»`)).toContainText(today());
    const catalog = await rest(request).rpc('catalog', { p_q: tutorName.split(' ')[1] });
    expect(catalog.body).toEqual([]);
    expect(sql(`select hidden_reason from tutors where user_id = '${tutor.id}'`)).toBe('Фото не соответствует правилам');

    // and return it
    await act(page, tutorName, 'Вернуть анкету', 'Фото заменено');
    await expect(row.getByText('Опубликована')).toBeVisible();
    await expect(journal.getByText(`Светлана вернула анкету: ${tutorName}: «Фото заменено»`)).toBeVisible();

    // block the student
    row = await findUser(page, student.email);
    await expect(row).toContainText('ученик');
    await act(page, studentName, 'Заблокировать аккаунт', 'Спам в заявках');
    await expect(row.getByText('Заблокирован')).toBeVisible();
    await expect(journal.getByText(`Светлана заблокировала аккаунт: ${studentName}: «Спам в заявках»`)).toContainText(today());
    const log = sql(`select string_agg(action || ':' || reason, ',' order by id) from admin_log where admin_id = '${admin.id}'`);
    expect(log).toBe('hide_tutor:Фото не соответствует правилам,unhide_tutor:Фото заменено,block_user:Спам в заявках');

    // a blocked account cannot sign in (spec, section 6)
    const token = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      data: { email: student.email, password: PASSWORD },
    });
    expect(token.status()).toBe(403);
    const other = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport, locale: 'ru-RU' });
    const guest = await other.newPage();
    await guest.goto('/login/');
    await logInInForm(guest, student.email);
    await expect(guest.getByText(/Аккаунт заблокирован/)).toBeVisible();
    await expect(guest).toHaveURL(/\/login\/$/);
    await other.close();

    // the admin cannot act on their own account
    await findUser(page, admin.email);
    await expect(page.getByRole('button', { name: /^Действия:/ })).toHaveCount(0);
  });
});
