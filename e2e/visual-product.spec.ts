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

test('главная: шаги появляются при прокрутке, заголовки остаются неподвижными', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const steps = page.locator('#how .trh-steps > li');
  for (const step of await steps.all()) {
    await step.scrollIntoViewIfNeeded();
    await expect(step).toHaveCSS('animation-name', 'tr-step-arrive');
  }
  const heading = page.getByRole('heading', { name: 'Познакомьтесь до первого занятия', exact: true });
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveCSS('opacity', '1');
  const animations = await heading.evaluate((element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      if (node.getAnimations().some((animation) => animation.playState === 'running')) return true;
    }
    return false;
  });
  expect(animations).toBe(false);
  for (const name of ['Бесплатное знакомство', 'Стать топ-репетом']) {
    const bounds = await page.getByRole('link', { name, exact: true }).evaluate(button => {
      const box = button.getBoundingClientRect();
      const parent = button.parentElement!;
      const container = parent.getBoundingClientRect();
      const style = getComputedStyle(parent);
      return {
        left: box.left - container.left - parseFloat(style.paddingLeft),
        right: container.right - box.right - parseFloat(style.paddingRight),
      };
    });
    expect(bounds).toEqual({ left: 0, right: 0 });
  }
  await expect(page.getByRole('link', { name: 'Оплата и возвраты', exact: true })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});

for (const width of [320, 768, 1440]) {
  test(`визуальная композиция главной: ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'ширины задаются явно');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const image = page.locator('.p-home-trust img');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    const hasTransparentCorner = await image.evaluate((node: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      context.drawImage(node, 0, 0, 1, 1, 0, 0, 1, 1);
      return context.getImageData(0, 0, 1, 1).data[3] === 0;
    });
    expect(hasTransparentCorner).toBe(true);
    const bounds = await page.locator('.p-home-trust, .p-home-trust img').evaluateAll((elements) => elements.map((element) => {
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
