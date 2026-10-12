import { expect, test } from '@playwright/test';
import { cleanBooking, createUser, logInInForm, publishedTutor, signUpInForm, uniqueEmail, type PublishedTutor } from './helpers';

test.describe('У2.1-вход вход только когда нужен', () => {
  test('У2.1-вход гость открывает главную и каталог без входа', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-12T12:00:00+03:00'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Индивидуальные занятия/ })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/teachers/');
    await expect(page.getByRole('heading', { name: 'Топ репеты', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/teachers\/$/);
    await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
  });

  test('У2.1-вход гость на /cabinet/ видит вход, а после входа возвращается в /cabinet/', async ({ page, request }, info) => {
    const email = uniqueEmail('u21-guest', info);
    await createUser(request, { email });
    await page.goto('/cabinet/');
    await expect(page).toHaveURL(/\/login\/\?next=%2Fcabinet%2F$/);
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await logInInForm(page, email);
    await expect(page).toHaveURL(/\/cabinet\/$/);
    await expect(page.getByRole('heading', { name: 'Мои занятия' })).toBeVisible();
  });

  test('У2.1-вход неверный пароль: ошибка текстом, вход не происходит', async ({ page, request }, info) => {
    const email = uniqueEmail('u21-wrong', info);
    await createUser(request, { email });
    await page.goto('/login/');
    await logInInForm(page, email, 'not-the-password');
    await expect(page.getByText('Email или пароль не подходят. Проверьте раскладку или восстановите пароль.')).toBeVisible();
    await expect(page.getByLabel('Пароль')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/login\/$/);
  });

  test('У2.1-вход репетитор после входа попадает в сводку, кабинет ученика ему закрыт', async ({ page, request }, info) => {
    const email = uniqueEmail('u21-tutor', info);
    await createUser(request, { email, role: 'tutor', name: 'Анна Ковалёва' });
    await page.goto('/login/');
    await logInInForm(page, email);
    await expect(page).toHaveURL(/\/tutor\/$/);
    await page.goto('/cabinet/');
    await expect(page).toHaveURL(/\/tutor\/$/);
  });

  test.describe('запись гостем', () => {
    test.use({ timezoneId: 'Europe/Moscow' });
    let tutors: PublishedTutor[] = [];
    test.afterEach(async ({ request }) => {
      await cleanBooking(request, { tutors });
      tutors = [];
    });

    async function pickSlot(page: import('@playwright/test').Page, tutor: PublishedTutor) {
      await page.goto(`/teachers/${tutor.slug}/`);
      await expect(page.getByRole('heading', { name: tutor.name })).toBeVisible();
      await page.getByRole('group', { name: 'Дни' }).getByRole('button', { disabled: false }).nth(1).click();
      await page.getByRole('group', { name: /^Свободное время/ }).getByRole('button', { name: '12:00', exact: true }).click();
      await expect(page).toHaveURL(/slot=/);
      return new URL(page.url()).searchParams.get('slot')!;
    }

    test('У2.1-вход «Записаться» открывает вход, а после входа я на том же слоте', async ({ page, request }, info) => {
      const tutor = await publishedTutor(request, info);
      tutors = [tutor];
      const student = await createUser(request, { email: uniqueEmail('u21-slot', info) });
      const slot = await pickSlot(page, tutor);
      // browsing the profile never asks to log in
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Записаться' }).click();
      const dialog = page.getByRole('dialog', { name: 'Войдите, чтобы записаться' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Сохраним ваш выбор')).toBeVisible();
      await expect(dialog).toContainText(`${tutor.name} · `);
      await expect(dialog).toContainText('12:00');
      await logInInForm(dialog as unknown as import('@playwright/test').Page, student.email);
      await expect(page).toHaveURL(new RegExp(`/book/${tutor.slug}\\?subject=math&dur=60&slot=`));
      expect(new URL(page.url()).searchParams.get('slot')).toBe(slot);
      await expect(page.getByRole('heading', { name: 'Оформление записи' })).toBeVisible();
      await expect(page.getByText(/12:00–13:00/)).toBeVisible();
    });

    test('У2.1-вход после регистрации из окна входа возвращаюсь к тому же слоту, предмету и длительности', async ({ page, request }, info) => {
      const tutor = await publishedTutor(request, info);
      tutors = [tutor];
      const slot = await pickSlot(page, tutor);
      await page.getByRole('button', { name: 'Записаться' }).click();
      await page.getByRole('dialog').getByRole('link', { name: 'Зарегистрироваться' }).click();
      await expect(page).toHaveURL(/\/signup\/\?next=/);
      await signUpInForm(page, { name: 'Ирина', email: uniqueEmail('u21-new', info) });
      await expect(page).toHaveURL(new RegExp(`/book/${tutor.slug}\\?subject=math&dur=60&slot=`));
      expect(new URL(page.url()).searchParams.get('slot')).toBe(slot);
      await expect(page.getByText(/12:00–13:00/)).toBeVisible();
    });
  });
});
