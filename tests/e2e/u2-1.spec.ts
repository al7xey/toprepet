import { expect, test, type Page } from '@playwright/test';
import { apiFreeSlots, cleanBooking, publishedTutor, type PublishedTutor } from './helpers';

test.use({ timezoneId: 'Europe/Moscow' });

const HOUR = 3_600_000;
const days = (page: Page) => page.getByRole('group', { name: 'Дни' });
const slots = (page: Page) => page.getByRole('group', { name: /^Свободное время/ });
const price = (page: Page) => page.locator('.book .tot dd');
const slotInUrl = (page: Page) => Date.parse(new URL(page.url()).searchParams.get('slot') ?? '');

test.describe('У2.1 анкета: предмет, длительность, время в моём поясе, цена', () => {
  let tutors: PublishedTutor[] = [];
  test.afterEach(async ({ request }) => {
    await cleanBooking(request, { tutors });
    tutors = [];
  });

  test('У2.1 выбираю 90 минут: цена и слоты пересчитываются под 90 минут', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { subjects: [{ slug: 'math', prices: { 60: 2000, 90: 3000 } }] });
    tutors = [tutor];
    await page.goto(`/teachers/${tutor.slug}/`);
    await expect(page.getByRole('heading', { name: tutor.name })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Математика' })).toBeChecked();
    await expect(page.getByRole('radio', { name: /^60\s*мин/ })).toBeChecked();
    await expect(price(page)).toHaveText('2 000 ₽');
    // a whole day: the first one may be cut by the minimum lead time
    await days(page).getByRole('button', { disabled: false }).nth(1).click();
    await expect(slots(page).getByRole('button').last()).toHaveText('20:00');

    await page.getByRole('radio', { name: /^90\s*мин/ }).click();
    await expect(page.getByRole('radio', { name: /^90\s*мин/ })).toBeChecked();
    await expect(page).toHaveURL(/dur=90/);
    await expect(price(page)).toHaveText('3 000 ₽');
    await expect(slots(page).getByRole('button').last()).toHaveText('19:30');
    await expect(slots(page).getByRole('button', { name: '20:00', exact: true })).toHaveCount(0);
    await slots(page).getByRole('button').last().click();
    await expect(page).toHaveURL(/slot=/);
    await expect(page.locator('.book dl')).toContainText('19:30');
  });

  test('У2.1 репетитор в UTC+5, я в Москве: время по Москве с подписью «у репетитора»', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { name: 'Анна Уральская', tz: 'Asia/Yekaterinburg' });
    tutors = [tutor];
    await page.goto(`/teachers/${tutor.slug}/`);
    await expect(page.getByText('по Москве', { exact: true })).toBeVisible();
    await days(page).getByRole('button', { disabled: false }).nth(1).click();
    // the tutor's 09:00–21:00 is 07:00–19:00 in Moscow
    const first = slots(page).getByRole('button').first();
    await expect(first).toHaveText('07:00');
    await expect(first).toHaveAccessibleName('07:00, у репетитора 09:00');
    await expect(slots(page).getByRole('button').last()).toHaveAccessibleName('18:00, у репетитора 20:00');
    await first.click();
    await expect(page.getByText('У Анны на 2 часа больше: 07:00 по Москве = 09:00 в Екатеринбурге.')).toBeVisible();
  });

  test('У2.1 слоты раньше минимального времени до занятия и за горизонтом записи не показаны', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info, { horizonWeeks: 1, minLeadHours: 24 });
    tutors = [tutor];
    const api = await apiFreeSlots(request, tutor.id);
    const opened = Date.now();
    await page.goto(`/teachers/${tutor.slug}/`);
    await expect(page.getByText('Окна на ближайшие 24 часа не показываются.')).toBeVisible();
    await days(page).getByRole('button', { disabled: false }).first().click();
    await slots(page).getByRole('button').first().click();
    const earliest = slotInUrl(page);
    expect(earliest).toBeGreaterThanOrEqual(opened + 24 * HOUR - 60_000);
    expect(earliest).toBe(api[0]);

    const next = page.getByRole('button', { name: 'Следующая неделя' });
    if ((await next.count()) && (await next.isEnabled())) await next.click();
    await days(page).getByRole('button', { disabled: false }).last().click();
    await slots(page).getByRole('button').last().click();
    const latest = slotInUrl(page);
    expect(latest).toBeLessThanOrEqual(Date.now() + 7 * 24 * HOUR);
    expect(latest).toBe(api[api.length - 1]);
  });

  test('У2.1 на телефоне итог и «Записаться» закреплены внизу экрана', async ({ page, request }, info) => {
    const tutor = await publishedTutor(request, info);
    tutors = [tutor];
    await page.goto(`/teachers/${tutor.slug}/`);
    await days(page).getByRole('button', { disabled: false }).nth(1).click();
    await slots(page).getByRole('button').first().click();
    const book = page.getByRole('button', { name: 'Записаться' });
    await expect(book).toHaveCount(1);
    await expect(book).toBeEnabled();
    if (info.project.name === 'phone') {
      await page.evaluate(() => window.scrollTo(0, 0));
      const box = await book.boundingBox();
      const bar = await page.locator('.mbar').boundingBox();
      expect(bar && Math.round(bar.y + bar.height)).toBe(812);
      expect(box!.y).toBeGreaterThan(700);
      await expect(page.locator('.mbar')).toContainText('2 000 ₽');
    } else {
      await expect(page.locator('.mbar')).toBeHidden();
      await expect(page.locator('aside .book')).toContainText('Записаться');
    }
  });
});
