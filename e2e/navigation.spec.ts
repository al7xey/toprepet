import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('нижняя панель: нажатие открывает раздел, долгое нажатие переносит подложку', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/lessons');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await tabs.nth(2).click();
  await expect(page).toHaveURL(/\/me\/requests/);
  // долгое нажатие и перенос на «Уроки» (второй пункт): открывается тот раздел, над которым отпустили палец
  const from = await tabs.nth(2).boundingBox();
  const to = await tabs.nth(1).boundingBox();
  if (!from || !to) throw new Error('нет размеров пунктов панели');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.move(to.x + to.width / 2, from.y + from.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/me\/lessons/);
});
