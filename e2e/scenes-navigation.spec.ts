import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('переходы из профиля ученика имеют рабочую стрелку возврата', async ({ page }) => {
  await login(page, 'student');
  for (const name of ['Мои заявки', 'Мои репетиторы', 'Занятия', 'Сообщения', 'Уведомления', 'Платежи']) {
    await page.goto('/me/account');
    await page.locator('main nav[aria-label="Разделы кабинета"]').getByRole('link', { name, exact: true }).click();
    const back = page.locator('main').getByRole('link', { name: 'Профиль', exact: true });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/me\/account$/);
  }
});

test('смена предмета и знакомства сохраняет день, время и календарь', async ({ page }) => {
  await page.goto('/teachers/english');
  const calendar = page.locator('.trh-pf-calendar');
  await calendar.getByRole('tab').nth(1).click();
  await calendar.locator('.slot').first().click();
  const selected = await calendar.locator('.slot[aria-pressed=true]').innerText();
  const day = (await calendar.getByRole('tab', { selected: true }).textContent()) ?? '';
  for (const label of ['История', 'Бесплатное знакомство', 'Английский']) {
    await page.getByLabel('Предмет', { exact: true }).selectOption({ label });
    await expect(calendar.locator('.trk-slot-skel')).toHaveCount(0);
    await expect(calendar.getByRole('tab', { selected: true })).toHaveText(day);
    await expect(calendar.locator('.slot[aria-pressed=true]')).toHaveText(selected);
  }
});
