import { expect, test } from '@playwright/test';

test('pressing a control leaves its fill and the surrounding layout unchanged on touch', async ({ page, browserName }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/teachers');
  const button = page.getByRole('button', { name: 'Фильтры', exact: true });
  const sort = page.locator('summary[title="Сортировка"]');
  await expect(button).toBeVisible();
  await expect(page.locator('.trh-tools .search')).toHaveCSS('border-top-width', '1px');
  await page.evaluate(() => document.fonts.ready);
  const before = await button.boundingBox();
  const sortBefore = await sort.boundingBox();
  if (!before) throw new Error('Missing filter button bounds');
  const touch = testInfo.project.use.hasTouch && browserName === 'chromium'
    ? await page.context().newCDPSession(page)
    : null;
  const fill = () => button.evaluate(control => getComputedStyle(control).background);
  const initialFill = await fill();
  if (touch) {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: before.x + before.width / 2, y: before.y + before.height / 2 }],
    });
    expect(await fill()).toBe(initialFill);
  } else {
    await button.hover();
    await page.mouse.down();
  }
  expect(await button.evaluate(control => getComputedStyle(control, '::before').animationName)).toBe('none');
  expect(await button.boundingBox()).toEqual(before);
  expect(await sort.boundingBox()).toEqual(sortBefore);
  if (touch) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(1, 1);
    await page.mouse.up();
  }
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
