import { expect, test } from '@playwright/test';
import { createUser, firstLink, latestMailTo, logInInForm, PASSWORD, SUPABASE_URL, uniqueEmail } from './helpers';

async function requestReset(page: import('@playwright/test').Page, email: string) {
  await page.goto('/reset/');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Отправить ссылку' }).click();
  const answer = page.getByTestId('reset-answer');
  await expect(answer).toBeVisible();
  return ((await answer.textContent()) ?? '').replace(email, '<email>');
}

test.describe('У3.2 восстановление пароля', () => {
  test('У3.2 на любой email одинаковый ответ', async ({ page, request }, info) => {
    const known = uniqueEmail('u32-known', info);
    await createUser(request, { email: known });
    const forUnknown = await requestReset(page, uniqueEmail('u32-nobody', info));
    const forKnown = await requestReset(page, known);
    expect(forKnown).toBe(forUnknown);
    expect(forKnown).toContain('Если <email> зарегистрирован в TopRepet, на него придёт письмо со ссылкой.');
    await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible();
  });

  test('У3.2 ссылка из письма открывает /reset/new/, новый пароль подходит для входа, ссылка одноразовая', async ({ page, request }, info) => {
    const email = uniqueEmail('u32-reset', info);
    await createUser(request, { email });
    await requestReset(page, email);

    const letter = await latestMailTo(request, email);
    const link = firstLink(letter.HTML);
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset\/new\//);
    await expect(page.getByRole('heading', { name: 'Новый пароль' })).toBeVisible();
    await expect(page.getByText(`Для ${email}`)).toBeVisible();

    const newPassword = 'brand-new-pass-2';
    await page.getByLabel('Новый пароль').fill(newPassword);
    await page.getByLabel('Ещё раз').fill(newPassword);
    await page.getByRole('button', { name: 'Сохранить и войти' }).click();
    await expect(page).toHaveURL(/\/cabinet\/$/);

    // signed out, the old password no longer works and the new one does
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login/');
    await logInInForm(page, email, PASSWORD);
    await expect(page.getByText('Email или пароль не подходят', { exact: false })).toBeVisible();
    await logInInForm(page, email, newPassword);
    await expect(page).toHaveURL(/\/cabinet\/$/);

    // the same link a second time
    await page.evaluate(() => localStorage.clear());
    await page.goto(link);
    await expect(page.getByRole('heading', { name: 'Ссылка устарела' })).toBeVisible();
  });

  test('У3.2 испорченная или истёкшая ссылка: текст и кнопка «Отправить ещё раз»', async ({ page, baseURL }) => {
    const redirect = encodeURIComponent(`${baseURL}/reset/new/`);
    await page.goto(`${SUPABASE_URL}/auth/v1/verify?token=garbage-token&type=recovery&redirect_to=${redirect}`);
    await expect(page).toHaveURL(/\/reset\/new\//);
    await expect(page.getByRole('heading', { name: 'Ссылка устарела' })).toBeVisible();
    await page.getByRole('link', { name: 'Отправить ещё раз' }).click();
    await expect(page).toHaveURL(/\/reset\/$/);
    await expect(page.getByRole('heading', { name: 'Восстановление пароля' })).toBeVisible();
  });
});
