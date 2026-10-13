import { expect, test } from '@playwright/test';
import { cleanBooking, fact, finishBookings, HOUR, hm, lessonFixture, rest, signInAs, type PublishedTutor } from './helpers';

test.use({ timezoneId: 'Europe/Moscow' });

test.describe('У7.1 занятие по ссылке из карточки', () => {
  let tutors: PublishedTutor[] = [];
  let ids: number[] = [];
  test.afterEach(async ({ request }) => {
    finishBookings(ids);
    await cleanBooking(request, { tutors });
    tutors = [];
    ids = [];
  });

  test('У7.1 до ссылки текст «Репетитор пришлёт ссылку перед началом»; после неё кнопка «Подключиться»', async ({ page, request }, info) => {
    const { tutor, student, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(page.getByText('Подтверждено', { exact: true })).toBeVisible();
    await expect(page.getByText('Репетитор пришлёт ссылку перед началом')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Подключиться' })).toHaveCount(0);
    await expect(page.getByText(/^Напомним на\sпочту и\sздесь: .+ и\s.+\.$/)).toBeVisible();

    expect((await rest(request, tutor.token).rpc('set_meeting_url', { p_id: id, p_url: 'https://telemost.yandex.ru/j/4471' })).ok).toBeTruthy();
    await page.reload();
    await expect(page.getByText('Репетитор пришлёт ссылку перед началом')).toHaveCount(0);
    const join = page.getByRole('link', { name: 'Подключиться' });
    await expect(join).toHaveAttribute('href', 'https://telemost.yandex.ru/j/4471');
    await expect(join).toHaveAttribute('target', '_blank');
    await expect(page.getByText(/Ссылка на\sзвонок от\sАнны: telemost\.yandex\.ru\/j\/4471/)).toBeVisible();
  });

  test('У7.1 время в моём поясе (Москва) с подписью пояса репетитора (UTC+5)', async ({ page, request }, info) => {
    const { tutor, student, slot, id } = await lessonFixture(request, info);
    tutors = [tutor];
    ids = [id];
    expect((await rest(request, tutor.token).rpc('set_meeting_url', { p_id: id, p_url: 'https://meet.example.com/x' })).ok).toBeTruthy();
    await signInAs(page, student);
    await page.goto(`/cabinet/lessons/${id}`);
    await expect(fact(page, 'Когда')).toContainText(`${hm(slot, 'Europe/Moscow')}–${hm(slot + HOUR, 'Europe/Moscow')}`);
    await expect(fact(page, 'У Анны')).toHaveText(`${hm(slot, 'Asia/Yekaterinburg')}, Екатеринбург`);
    await expect(page.getByText(`Начало в ${hm(slot, 'Europe/Moscow')} по Москве`)).toBeVisible();
  });
});
