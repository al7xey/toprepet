import { expect, test } from '@playwright/test';
import {
  apiBook,
  apiConfirm,
  cleanAdmin,
  cleanBooking,
  createAdmin,
  createUser,
  dropProblems,
  fact,
  finishBookings,
  HOUR,
  moveBooking,
  mskDay,
  publishedTutor,
  rest,
  signInAdmin,
  slotAfter,
  uniqueEmail,
  uniqueWord,
  type Account,
  type PublishedTutor,
} from './helpers';

test.describe('А2 реестр занятий', () => {
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

  test('А2 поиск по ученику, репетитору, дате, статусу и фильтр «есть проблема»; карточка занятия с историей статусов', async ({ page, request }, info) => {
    const tutorWord = uniqueWord();
    const studentWord = uniqueWord();
    const tutor = await publishedTutor(request, info, { name: `Анна ${tutorWord}` });
    tutors = [tutor];
    const student = await createUser(request, { email: uniqueEmail('student', info), name: `Ольга ${studentWord}` });
    // a lesson that has ended with a problem, and a pending booking on a later day
    const past = await apiBook(request, student, tutor, await slotAfter(request, tutor.id, 30 * HOUR));
    await apiConfirm(request, tutor, past);
    const laterSlot = await slotAfter(request, tutor.id, 4 * 24 * HOUR);
    const pending = await apiBook(request, student, tutor, laterSlot);
    ids = [past, pending];
    moveBooking(past, Date.now() - 3 * HOUR);
    const reported = await rest(request, student.token).rpc('report_problem', { p_id: past, p_kind: 'no_show', p_text: 'Ждала 20 минут' });
    expect(reported.ok, JSON.stringify(reported.body)).toBeTruthy();

    admin = await createAdmin(request, info);
    await signInAdmin(page, admin);
    await expect(page.getByRole('heading', { name: 'Занятия' })).toBeVisible();
    const rows = page.locator('.tbl tbody tr');
    const search = page.getByLabel('Ученик или репетитор');

    // by the tutor and by the student
    await search.fill(tutorWord);
    await search.press('Enter');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText(`Анна ${tutorWord}`);
    await search.fill(studentWord);
    await search.press('Enter');
    await expect(rows).toHaveCount(2);
    await expect(page.getByText('2 записи')).toBeVisible();

    // by status
    await page.getByLabel('Статус').selectOption({ label: 'Ждёт подтверждения' });
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(`B-${pending}`);
    await expect(rows.first()).toContainText('Ждёт подтверждения');
    await page.getByLabel('Статус').selectOption({ label: 'Все статусы' });
    await expect(rows).toHaveCount(2);

    // by date (Moscow day of the start)
    await page.getByLabel('Дата').fill(mskDay(laterSlot));
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(`B-${pending}`);
    await page.getByLabel('Дата').fill('');
    await expect(rows).toHaveCount(2);

    // «есть проблема»
    await page.getByLabel('Есть проблема').click();
    await expect(page.getByLabel('Есть проблема')).toBeChecked();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(`B-${past}`);
    await expect(rows.first()).toContainText('На рассмотрении');
    await page.getByLabel('Есть проблема').click();
    await expect(page.getByLabel('Есть проблема')).not.toBeChecked();

    // by number
    await search.fill(`B-${pending}`);
    await search.press('Enter');
    await expect(rows).toHaveCount(1);

    // the card: participants and the history of statuses
    await search.fill(studentWord);
    await search.press('Enter');
    await page.getByRole('link', { name: `B-${past}` }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/lessons/${past}$`));
    await expect(page.getByRole('heading', { name: `B-${past}` })).toBeVisible();
    await expect(fact(page, 'Ученик')).toContainText(student.email);
    await expect(fact(page, 'Репетитор')).toContainText(`Анна ${tutorWord}`);
    const history = page.getByRole('region', { name: 'История' });
    await expect(history.getByText(/запись создана, ждёт подтверждения$/)).toBeVisible();
    await expect(history.getByText(/Анна подтвердила$/)).toBeVisible();
    await expect(history.getByText(/ученик сообщил о проблеме: репетитор не пришёл$/)).toBeVisible();
    await expect(history.getByText('Ждёт решения поддержки')).toBeVisible();
    await expect(page.getByText('Ждала 20 минут')).toBeVisible();
  });

  test('А2 реестр закрыт для ученика и гостя', async ({ page, request }, info) => {
    await page.goto('/admin/lessons');
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
    await expect(page.getByRole('heading', { name: /Вход в\sадминку/ })).toBeVisible();
    const student = await createUser(request, { email: uniqueEmail('student', info) });
    expect((await rest(request, student.token).rpc('admin_bookings')).ok).toBeFalsy();
  });
});
