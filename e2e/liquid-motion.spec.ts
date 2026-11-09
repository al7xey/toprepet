import { expect, test } from '@playwright/test';

test('liquid press keeps buttons and neighbouring controls stationary', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/teachers');
  const button = page.getByRole('button', { name: 'Фильтры', exact: true });
  const sort = page.locator('summary[title="Сортировка"]');
  await expect(button).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const before = await button.boundingBox();
  const sortBefore = await sort.boundingBox();
  expect(before).not.toBeNull();
  await button.hover();
  await page.mouse.down();
  await expect(button).toHaveClass(/lg-pulse/);
  for (const delay of [40, 100, 200]) {
    await page.waitForTimeout(delay);
    expect(await button.boundingBox()).toEqual(before);
    expect(await sort.boundingBox()).toEqual(sortBefore);
  }
  await page.mouse.move(1, 1);
  await page.mouse.up();
  await expect(button).not.toHaveClass(/lg-pulse/);
});

test('reduced motion removes the decorative pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/teachers');
  const button = page.getByRole('button', { name: 'Фильтры', exact: true });
  await button.hover();
  await page.mouse.down();
  await expect(button).not.toHaveClass(/lg-pulse/);
  await page.mouse.move(1, 1);
  await page.mouse.up();
});

test('page canvas is white and opening filters preserves the trigger position', async ({ page }) => {
  await page.goto('/teachers');
  await expect(page.locator('.trh-page')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const button = page.getByRole('button', { name: 'Фильтры', exact: true });
  const before = await button.boundingBox();
  await button.click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  expect(await button.boundingBox()).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(button).toBeFocused();
  expect(await button.boundingBox()).toEqual(before);
});

test('sign-in controls fit at 320px and retain their size while submitting', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/login');
  const yandex = page.getByRole('button', { name: 'Войти через Яндекс ID' });
  await expect(yandex).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await yandex.evaluate(button => button.scrollHeight <= button.clientHeight + 1)).toBe(true);

  await page.getByLabel('Почта', { exact: true }).fill('olga@mail.ru');
  await page.locator('input[type=password]').fill('demo');
  const submit = page.locator('form button[type=submit]');
  await submit.scrollIntoViewIfNeeded();
  const before = await submit.boundingBox();
  const whileBusy = submit.evaluate(button => new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (button.getAttribute('aria-busy') !== 'true') return;
      observer.disconnect();
      clearTimeout(timeout);
      const { x, y, width, height } = button.getBoundingClientRect();
      resolve({ x, y, width, height });
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 3000);
    observer.observe(button, { attributes: true, attributeFilter: ['aria-busy'] });
  }));
  await submit.click();
  expect(await whileBusy).toEqual(before);
  await expect(page).toHaveURL(/\/me\/lessons$/);
});
