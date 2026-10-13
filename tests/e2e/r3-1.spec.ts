import { expect, test } from '@playwright/test';
import { cleanUp, createUser, rest, seedReadyTutor, signInNewTutor, uniqueEmail, type Account } from './helpers';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

test.describe('Р3.1 регулярная неделя окон', () => {
  let left: { tutor?: Account; student?: Account; booking?: number } = {};
  test.afterEach(async ({ request }) => {
    await cleanUp(request, left);
    left = {};
  });

  test('Р3.1 окна по дням недели с шагом 30 минут в поясе репетитора сохраняются после перезагрузки', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info, { tz: 'Asia/Yekaterinburg' });
    await page.goto('/tutor/schedule/');
    await expect(page.getByRole('heading', { name: 'Расписание' })).toBeVisible();
    await expect(page.getByTestId('tutor-zone')).toHaveText('Екатеринбург, UTC+5');
    await expect(page.getByText('Окон пока нет.', { exact: false })).toBeVisible();

    // the grid of start times has a 30-minute step only
    const start = page.getByLabel('Начало');
    await expect(start.locator('option', { hasText: '10:30' })).toHaveCount(1);
    await expect(start.locator('option', { hasText: '10:15' })).toHaveCount(0);

    await page.getByLabel('День недели').selectOption({ label: 'Понедельник' });
    await start.selectOption({ label: '10:00' });
    await page.getByLabel('Конец').selectOption({ label: '12:30' });
    await page.getByRole('button', { name: 'Добавить окно' }).click();
    // a cell of the grid opens half an hour
    await page.getByRole('button', { name: 'Ср 19:00–19:30, закрыто' }).click();
    await expect(page.getByRole('button', { name: 'Ср 19:00–19:30, свободно' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Сохранили расписание.')).toBeVisible();

    await page.reload();
    const list = page.getByRole('list', { name: 'Окна по дням' });
    await expect(list.getByRole('listitem')).toHaveText([/Понедельник\s*10:00–12:30/, /Среда\s*19:00–19:30/]);
    await expect(page.getByRole('button', { name: 'Пн 12:00–12:30, свободно' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Пн 12:30–13:00, закрыто' })).toHaveAttribute('aria-pressed', 'false');

    // stored as minutes of the tutor's own day, not converted to Moscow or UTC
    const rows = (await rest(request, tutor.token).get(`weekly_windows?tutor_id=eq.${tutor.id}&select=weekday,start_min,end_min&order=weekday`)).body;
    expect(rows).toEqual([
      { weekday: 1, start_min: 600, end_min: 750 },
      { weekday: 3, start_min: 1140, end_min: 1170 },
    ]);

    // removing a window
    await page.getByRole('button', { name: 'Удалить окно Ср 19:00–19:30' }).click();
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Сохранили расписание.')).toBeVisible();
    await page.reload();
    await expect(list.getByRole('listitem')).toHaveText([/Понедельник\s*10:00–12:30/]);
  });

  test('Р3.1 пересекающиеся окна не добавляются, ошибка объяснена текстом', async ({ page, request }, info) => {
    await signInNewTutor(page, request, info);
    await page.goto('/tutor/schedule/');
    const add = async (day: string, from: string, to: string) => {
      await page.getByLabel('День недели').selectOption({ label: day });
      await page.getByLabel('Начало').selectOption({ label: from });
      await page.getByLabel('Конец').selectOption({ label: to });
      await page.getByRole('button', { name: 'Добавить окно' }).click();
    };
    await add('Вторник', '10:00', '12:00');
    await add('Вторник', '11:00', '13:00');
    await expect(page.getByText('Окно пересекается с 10:00–12:00 в этот день. Измените время или удалите старое окно.')).toBeVisible();
    await expect(page.getByLabel('Начало')).toHaveAttribute('aria-invalid', 'true');
    await add('Вторник', '14:00', '13:00');
    await expect(page.getByText('Конец окна должен быть позже начала.')).toBeVisible();
    // touching windows are fine, and the same time on another day too
    await add('Вторник', '12:00', '13:00');
    await add('Среда', '10:00', '12:00');
    await expect(page.locator('.err')).toHaveCount(0);
    const list = page.getByRole('list', { name: 'Окна по дням' });
    await expect(list.getByRole('listitem')).toHaveText([/Вторник\s*10:00–12:0012:00–13:00/, /Среда\s*10:00–12:00/]);
  });

  test('Р3.1 окно с записью ученика помечено и не редактируется', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info, { tz: 'Asia/Yekaterinburg' });
    const subject = await seedReadyTutor(request, tutor);
    const tdb = rest(request, tutor.token);
    expect((await tdb.rpc('publish_tutor')).ok).toBeTruthy();
    const student = await createUser(request, { email: uniqueEmail('r31-student', info) });
    const slots = (await rest(request).rpc('free_slots', { p_tutor: tutor.id, p_duration: 60 })).body as string[];
    const booked = await rest(request, student.token).rpc('create_booking', {
      p_tutor: tutor.id,
      p_subject: subject,
      p_duration: 60,
      p_starts_at: slots[0],
    });
    expect(booked.ok, JSON.stringify(booked.body)).toBeTruthy();
    left = { tutor, student, booking: booked.body as number };

    const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Yekaterinburg', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(slots[0]));
    const part = (t: string) => local.find(p => p.type === t)!.value;
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(part('weekday'));
    const short = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][day];

    await page.goto('/tutor/schedule/');
    const row = page.getByRole('list', { name: 'Окна по дням' }).getByRole('listitem').filter({ hasText: DAYS[day] });
    await expect(row).toContainText('09:00–21:00 есть записи');
    await expect(row.getByRole('button', { name: /Удалить окно/ })).toHaveCount(0);
    const cell = page.getByRole('button', { name: `${short} ${part('hour')}:${part('minute')}–`, exact: false });
    await expect(cell).toHaveAccessibleName(/ждёт подтверждения$/);
    await expect(cell).toBeDisabled();
    // other cells of the same window are locked too
    await expect(page.getByRole('button', { name: `${short} 09:00–09:30, свободно` })).toBeDisabled();
  });
});
