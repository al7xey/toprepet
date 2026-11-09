import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('фильтры: клавиатура остаётся в окне, Escape возвращает фокус', async ({ page }) => {
  await page.goto('/teachers');
  const trigger = page.getByRole('button', { name: 'Фильтры', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Фильтры' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('dialog:modal')).toHaveCount(1);
  const originalViewport = page.viewportSize();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const lines = await dialog.locator('.trh-fpage-foot button').evaluateAll((buttons) => buttons.map((button) => {
      const range = document.createRange();
      range.selectNodeContents(button);
      return range.getClientRects().length;
    }));
    expect(lines, `подписи кнопок на ${width} px`).toEqual([1, 1]);
  }
  if (originalViewport) await page.setViewportSize(originalViewport);
  await expect(dialog.getByRole('button', { name: 'Закрыть фильтры' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Показать', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Закрыть фильтры' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Показать', exact: true })).toBeFocused();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations.map((item) => item.id)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('фильтры: выбор предмета и сброс работают внутри модального окна', async ({ page }) => {
  await page.goto('/teachers');
  const trigger = page.getByRole('button', { name: 'Фильтры', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Фильтры' });
  await dialog.getByRole('button', { name: 'Английский язык', exact: true }).click();
  await expect(page).toHaveURL(/subject=/);
  await dialog.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await expect(page).not.toHaveURL(/subject=/);
  await dialog.getByRole('button', { name: 'Показать', exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Закрыть фильтры' }).click();
  await expect(trigger).toBeFocused();
});

test('сортировка: выбранное значение озвучивается, фокус возвращается после выбора и Escape', async ({ page }) => {
  await page.goto('/teachers');
  const trigger = page.locator('summary[title="Сортировка"]');
  await trigger.click();
  await page.getByRole('button', { name: 'Сначала дешевле', exact: true }).click();
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-label', 'Сортировка: Сначала дешевле');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Сначала дороже', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.locator('.trh-drop[open]')).toHaveCount(0);
});
