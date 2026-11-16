import { expect, test } from '@playwright/test';

for (const width of [320, 390, 768, 1440]) {
  test(`шапка остаётся над страницей до конца прокрутки: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const header = page.locator('.trh-public-nav > header');
    await expect(header).toBeVisible();
    const initial = await header.boundingBox();
    const title = await page.locator('#hero-title').boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(initial!.y + initial!.height);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect.poll(async () => Math.round((await header.boundingBox())!.y)).toBe(Math.round(initial!.y));
    expect(await header.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
    if (width <= 760) {
      const gaps = await header.evaluate(element => {
        const edge = element.getBoundingClientRect();
        const button = element.querySelector('.trh-burger')!.getBoundingClientRect();
        const login = element.querySelector('.trh-actions')!.getBoundingClientRect();
        return [button.left - login.right, edge.right - button.right, button.top - edge.top, edge.bottom - button.bottom];
      });
      expect(gaps.map(Math.round)).toEqual([8, 8, 8, 8]);
      await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
      await expect(page.locator('.trh-menu-scrim')).toBeVisible();
      await expect(page.locator('.trh-menu-scrim')).toHaveCSS('position', 'fixed');
      await page.keyboard.press('Escape');
      await expect(page.locator('.trh-menu-scrim')).toHaveCount(0);
    }
  });
}
