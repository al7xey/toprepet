import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('нижняя панель ученика: Поиск, Занятия, Чаты, Профиль; заявки живут в профиле', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/account');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(1)).toContainText('Занятия');
  await tabs.nth(1).click();
  await expect(page).toHaveURL(/\/me\/lessons/);
  await expect(tabs.nth(1)).toHaveClass(/cur/);
  // заявки, платежи и уведомления подсвечивают «Профиль»
  await page.goto('/me/requests');
  await expect(tabs.nth(3)).toHaveClass(/cur/);
});

test('нижняя панель: пилюлю можно тянуть, открывается пункт, над которым отпустили палец', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'student');
  await page.goto('/me/chats');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  const from = await tabs.nth(2).boundingBox();
  const to = await tabs.nth(3).boundingBox();
  if (!from || !to) throw new Error('нет размеров пунктов панели');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // пока палец на панели, пилюля увеличена, а страница не меняется
  await expect(page.locator('nav.trk-tabbar')).toHaveClass(/press/);
  await page.mouse.move(to.x + to.width / 2, from.y + from.height / 2, { steps: 12 });
  await expect(page).toHaveURL(/\/me\/chats/);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/me\/account/);
});

test('нижняя панель: пилюля плавно переезжает и ни в какой момент не выходит за панель', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await login(page, 'student');
  await page.goto('/me/chats');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  // следим за пилюлей на каждом кадре, пока она едет с «Чатов» на «Поиск» и обратно на «Профиль»
  await page.evaluate(() => {
    const w = window as unknown as { __pill: { out: number; frames: number } };
    w.__pill = { out: 0, frames: 0 };
    const tick = () => {
      const bar = document.querySelector('nav.trk-tabbar')?.getBoundingClientRect();
      const pill = document.querySelector('.tabpill')?.getBoundingClientRect();
      if (bar && pill) {
        w.__pill.frames += 1;
        if (pill.left < bar.left - 0.5 || pill.right > bar.right + 0.5 || pill.top < bar.top - 0.5 || pill.bottom > bar.bottom + 0.5) w.__pill.out += 1;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await tabs.nth(0).click();
  await page.waitForTimeout(150);
  await tabs.nth(3).click();
  await page.waitForTimeout(700);
  const result = await page.evaluate(() => (window as unknown as { __pill: { out: number; frames: number } }).__pill);
  expect(result.frames).toBeGreaterThan(20);
  expect(result.out).toBe(0);
  await expect(page).toHaveURL(/\/me\/account/);
});

test('нижняя панель: пилюля симметрична слева и справа и едет без рывков', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await login(page, 'student');
  const margins = async () => page.evaluate(() => {
    const bar = document.querySelector('nav.trk-tabbar')?.getBoundingClientRect();
    const pill = document.querySelector('.tabpill')?.getBoundingClientRect();
    if (!bar || !pill) return null;
    return { left: pill.left - bar.left, right: bar.right - pill.right, top: pill.top - bar.top, bottom: bar.bottom - pill.bottom };
  });
  await page.goto('/teachers');
  await page.locator('.tabpill').waitFor();
  await page.waitForTimeout(300);
  const first = await margins();
  await page.goto('/me/account');
  await page.locator('.tabpill').waitFor();
  await page.waitForTimeout(300);
  const last = await margins();
  if (!first || !last) throw new Error('нет пилюли: ' + JSON.stringify({ first, last }));
  // слева у первого пункта столько же места, сколько справа у последнего
  expect(Math.abs(first.left - last.right)).toBeLessThanOrEqual(0.6);
  expect(Math.abs(first.top - first.bottom)).toBeLessThanOrEqual(0.6);
  // переезд с первого пункта на последний: пилюля только движется вперёд, без отскоков и рывков назад
  await page.goto('/teachers');
  await page.locator('.tabpill').waitFor();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const w = window as unknown as { __lefts: number[] };
    w.__lefts = [];
    const tick = () => {
      const pill = document.querySelector('.tabpill')?.getBoundingClientRect();
      if (pill) w.__lefts.push(pill.left);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.locator('nav.trk-tabbar a.tab').nth(3).click();
  await page.waitForTimeout(800);
  const lefts = await page.evaluate(() => (window as unknown as { __lefts: number[] }).__lefts);
  for (let i = 1; i < lefts.length; i += 1) expect(lefts[i]).toBeGreaterThanOrEqual(lefts[i - 1] - 0.5);
  const total = lefts[lefts.length - 1] - lefts[0];
  expect(total).toBeGreaterThan(100);
  // страница пересобирает панель на ходу, но пилюля не прыгает: ни один кадр не съедает больше 60% пути
  const maxStep = Math.max(...lefts.slice(1).map((v, i) => v - lefts[i]));
  expect(maxStep).toBeLessThan(total * 0.6);
});

test('репетитор: в нижней панели есть «Профиль», а раздела «Доход» там нет', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 600, 'нижняя панель только на телефоне');
  await login(page, 'tutor');
  await page.goto('/tutor/lessons');
  const tabs = page.locator('nav.trk-tabbar a.tab');
  await expect(tabs.last()).toHaveText('Профиль');
  await tabs.last().click();
  await expect(page).toHaveURL(/\/tutor\/account/);
  await expect(page.locator('nav.trk-tabbar a.tab', { hasText: 'Доход' })).toHaveCount(0);
});

test('репетитор выходит из аккаунта через настройки профиля', async ({ page }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/account');
  await page.getByRole('link', { name: 'Настройки', exact: true }).click();
  await expect(page).toHaveURL(/\/tutor\/account\/settings/);
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Выйти' }).click();
  await expect(page).not.toHaveURL(/\/tutor\/account/);
  await page.goto('/tutor/account');
  await expect(page).toHaveURL(/\/login/);
});
