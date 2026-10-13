import { expect, test } from '@playwright/test';
import { cleanBooking, finishBookings, lessonFixture, rest, type PublishedTutor } from './helpers';

test.describe('О2 письма о важных событиях', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('О2 письма о записи и смене её статуса в стиле сайта видны на /dev/mail', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info, { pending: true });
    tutors = [tutor];
    ids = [id];
    expect((await rest(request, tutor.token).rpc('confirm_booking', { p_id: id })).ok).toBeTruthy();

    await page.goto('/dev/mail');
    const letters = page.getByRole('list', { name: 'Письма' }).getByRole('link');
    const toTutor = letters.filter({ hasText: tutor.email });
    await expect(toTutor.filter({ hasText: /^Новая запись: Ирина, / })).toHaveCount(1);
    const confirmed = letters.filter({ hasText: student.email }).filter({ hasText: /^Анна подтвердила занятие в / });
    await expect(confirmed).toHaveCount(1);
    await confirmed.click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Анна подтвердила занятие в');
    await expect(page.getByText(`Кому: ${student.email}`)).toBeVisible();
    const letter = page.frameLocator('iframe[title="Текст письма"]');
    await expect(letter.getByText('toprepet', { exact: true })).toBeVisible();
    await expect(letter.getByRole('link', { name: 'Открыть занятие' })).toHaveAttribute('href', new RegExp(`/cabinet/lessons/${id}$`));
    await expect(letter.locator('table')).toContainText('Стоимость');
    await expect(letter.locator('table')).toContainText('2 000 ₽');
    await expect(letter.getByText(`Письмо отправлено на ${student.email}. Поддержка: Telegram @toprepet_manager`)).toBeVisible();
  });
});
