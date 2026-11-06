import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, login, logout } from './helpers';

test('главная: знакомство сохраняет условие', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Бесплатное знакомство', exact: true }).click();
  await expect(page).toHaveURL(/intro=1/);
  await expect(page.locator('a.tc').first()).toBeVisible();
});

test('публичные CTA соответствуют роли пользователя', async ({ page }) => {
  for (const role of ['student', 'tutor', 'admin'] as const) {
    await login(page, role);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Создать заявку', exact: true })).toHaveCount(role === 'student' ? 1 : 0);
    await page.goto('/for-repetitor');
    await expect(page.getByRole('link', { name: 'Создать анкету', exact: true })).toHaveCount(0);
    await expect(page.locator('main a[href="/signup?role=tutor"]')).toHaveCount(0);
    await page.locator('main .trh-cta').click();
    await expect(page).toHaveURL(role === 'student' ? /\/me\/lessons/ : role === 'tutor' ? /\/tutor\/lessons/ : /\/admin\/disputes/);
    await logout(page);
  }
});

test('анимации появляются при прокрутке и отключаются при уменьшении движения', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Object.defineProperty(window, '__reveals', { value: [] });
    Element.prototype.animate = function (...args: Parameters<typeof original>) {
      if (this.hasAttribute('data-rv') || this.parentElement?.dataset.rv === 'seq') (window as unknown as { __reveals: string[] }).__reveals.push(this.tagName);
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.getByRole('heading', { name: 'Познакомьтесь до первого занятия', exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __reveals: string[] }).__reveals.length)).toBeGreaterThan(0);
  const beforeNavigation = await page.evaluate(() => (window as unknown as { __reveals: string[] }).__reveals.length);
  await page.getByRole('link', { name: 'Бесплатное знакомство', exact: true }).click();
  await expect(page).toHaveURL(/intro=1/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __reveals: string[] }).__reveals.length)).toBeGreaterThan(beforeNavigation);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.getByRole('link', { name: 'TopRepet, главная', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Познакомьтесь до первого занятия', exact: true })).toHaveCSS('opacity', '1');
  await page.reload();
  await page.getByRole('heading', { name: 'Вопросы и ответы', exact: true }).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => (window as unknown as { __reveals: string[] }).__reveals.length)).toBe(0);
  await expectNoHorizontalScroll(page);
});

for (const width of [320, 768, 1440]) {
  test(`визуальная композиция главной: ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'ширины задаются явно');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const image = page.locator('.p-home-intro-art img');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    const bounds = await page.locator('.p-home-intro-layout, .p-home-intro-art').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= -1 && box.right <= innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1;
    }));
    expect(bounds.every(Boolean)).toBe(true);
    await expectNoHorizontalScroll(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
  });
}
