import { expect, type Page } from '@playwright/test';

export const ACCOUNTS = {
  student: 'olga@mail.ru',
  tutor: 'anastasia@toprepet.ru',
  admin: 'admin@toprepet.ru',
} as const;

/** Вход под демо-аккаунтом мока (пароль у всех «demo»). */
export async function login(page: Page, role: keyof typeof ACCOUNTS | string) {
  const email = role in ACCOUNTS ? ACCOUNTS[role as keyof typeof ACCOUNTS] : role;
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill('demo');
  await page.locator('button[type=submit]').click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Выход: сбрасываем сессию мока и открываем главную. */
export async function logout(page: Page) {
  await page.evaluate(() => {
    const key = 'toprepet-mock-v3';
    const state = JSON.parse(localStorage.getItem(key) ?? '{}');
    state.sessionUserId = null;
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.goto('/');
}

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 600;

/** Горизонтальной прокрутки быть не должно ни на одном экране. */
export async function expectNoHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, 'страница шире экрана').toBeLessThanOrEqual(0);
}
