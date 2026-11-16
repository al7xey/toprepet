import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('публичные отзывы скрыты, запись на знакомство выбирается одним селектом', async ({ page }) => {
  await login(page, 'student');
  await page.goto('/teachers');
  await expect(page.locator('a.tc').first()).toBeVisible();
  await expect(page.locator('a.tc .rt')).toHaveCount(0);
  await page.locator('a.tc').first().click();
  await expect(page.locator('#reviews,.trh-pf-rating')).toHaveCount(0);
  await expect(page.getByLabel('Тема занятия', { exact: true })).toHaveCount(0);
  const calendar = page.locator('.trh-pf-calendar');
  await expect(calendar.locator('.trk-tz')).toHaveCount(1);
  await expect(calendar.locator('.trk-slots .trk-tz')).toHaveCount(0);
  await page.locator('.slot').first().click();
  const booking = page.locator('.trh-pf-booking');
  await expect(booking.getByRole('link', { name: 'Записаться', exact: true })).toHaveAttribute('href', /kind=regular/);
  await booking.getByLabel('Предмет', { exact: true }).selectOption({ label: 'Бесплатное знакомство' });
  await expect(booking.getByText('Бесплатно', { exact: true })).toBeVisible();
  await expect(booking.getByRole('link', { name: 'Записаться', exact: true })).toHaveAttribute('href', /kind=intro/);
  await expect(page.locator('.slot[aria-pressed=true]')).toHaveCount(1);
  await page.locator('.slot').first().click();
  await booking.getByRole('link', { name: 'Записаться', exact: true }).click();
  await expect(page).toHaveURL(/kind=intro/);
  await expect(page.getByRole('heading', { name: 'Запись на знакомство', exact: true })).toBeVisible();
  await expect(page.getByLabel('Тема занятия', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Способ оплаты', { exact: true })).toHaveCount(0);
});
