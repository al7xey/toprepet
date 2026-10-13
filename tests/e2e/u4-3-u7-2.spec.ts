import { expect, test, type Page } from '@playwright/test';
import { cleanBooking, finishBookings, HOUR, lessonFixture, moveBooking, outboxTo, rest, runJobs, signInAs, type PublishedTutor } from './helpers';

/** The header link to the cabinet carries the unread count in its name. */
const header = (page: Page) => page.getByRole('banner').getByRole('link', { name: /^Кабинет: / });

test.describe('У4.3+У7.2 письма, счётчик и напоминания', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У4.3+У7.2 статус меняется: приходит письмо и растёт счётчик «Уведомления»; после открытия раздела счётчик обнуляется', async ({ page, request }, info) => {
    // more than a day ahead, so reminders run by parallel tests never touch it
    const { tutor, student, id } = await lessonFixture(request, info, { pending: true, after: 30 * HOUR });
    tutors = [tutor];
    ids = [id];
    await signInAs(page, student);
    await expect(header(page)).toHaveAccessibleName('Кабинет: Ирина');

    expect((await rest(request, tutor.token).rpc('confirm_booking', { p_id: id })).ok).toBeTruthy();
    expect(outboxTo(student.email, 'booking_confirmed')).toHaveLength(1);
    await page.reload();
    await expect(header(page)).toHaveAccessibleName('Кабинет: Ирина, новых уведомлений: 1');
    await expect(page.getByRole('banner').getByText('1', { exact: true })).toBeVisible();
    const card = page.getByRole('list', { name: 'Ближайшие занятия' }).getByRole('link');
    await expect(card).toContainText('Подтверждено');
    await expect(card).toContainText('Новое');
    const menu = page.getByRole('navigation', { name: 'Кабинет' });
    if (info.project.name === 'desktop') {
      await expect(menu.getByRole('link', { name: 'Уведомления 1 новых' })).toBeVisible();
      await menu.getByRole('link', { name: /^Уведомления/ }).click();
    } else {
      await page.getByRole('button', { name: 'Открыть меню' }).click();
      const sheet = page.getByRole('dialog', { name: 'Меню' });
      await expect(sheet.getByRole('link', { name: 'Уведомления 1 новых' })).toBeVisible();
      await sheet.getByRole('link', { name: /^Уведомления/ }).click();
    }

    await expect(page).toHaveURL(/\/cabinet\/notifications\/$/);
    const items = page.getByRole('list', { name: 'Уведомления' }).getByRole('link');
    await expect(items.first()).toContainText(/^Анна подтвердила занятие /);
    await expect(items.first()).toContainText('новое');
    await expect(items.first()).toHaveAttribute('href', `/cabinet/lessons/${id}`);
    // opening the section resets the counter
    await expect(header(page)).toHaveAccessibleName('Кабинет: Ирина');
    await page.reload();
    await expect(items.first()).not.toContainText('новое');
    await expect(header(page)).toHaveAccessibleName('Кабинет: Ирина');

    // a new change; opening the lesson itself also reads it
    expect((await rest(request, tutor.token).rpc('set_meeting_url', { p_id: id, p_url: 'https://meet.example.com/x' })).ok).toBeTruthy();
    expect(outboxTo(student.email, 'link_added')).toHaveLength(1);
    await page.goto('/cabinet/');
    await expect(header(page)).toHaveAccessibleName('Кабинет: Ирина, новых уведомлений: 1');
    await card.click();
    await expect(page.getByRole('link', { name: 'Подключиться' })).toBeVisible();
    await expect(header(page)).toHaveAccessibleName('Кабинет: Ирина');
    await page.goto('/cabinet/');
    await expect(card).not.toContainText('Новое');
  });

  test('У4.3+У7.2 напоминания приходят за 24 часа и за 1 час до начала', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    expect(outboxTo(student.email, 'reminder_24h')).toHaveLength(0);

    moveBooking(id, Date.now() + 23 * HOUR);
    runJobs();
    expect(outboxTo(student.email, 'reminder_24h')).toHaveLength(1);
    expect(outboxTo(tutor.email, 'reminder_24h')).toHaveLength(1);
    expect(outboxTo(student.email, 'reminder_1h')).toHaveLength(0);
    runJobs();
    expect(outboxTo(student.email, 'reminder_24h')).toHaveLength(1);

    moveBooking(id, Date.now() + 50 * 60_000);
    runJobs();
    expect(outboxTo(student.email, 'reminder_1h')).toHaveLength(1);
    expect(outboxTo(tutor.email, 'reminder_1h')).toHaveLength(1);

    await signInAs(page, student);
    await page.goto('/cabinet/notifications/');
    const items = page.getByRole('list', { name: 'Уведомления' }).getByRole('link');
    await expect(items.filter({ hasText: /^Через час занятие с Анной/ })).toHaveCount(1);
    await expect(items.filter({ hasText: /^Напоминание: занятие / })).toHaveCount(1);
  });
});
