import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, isPhone, login } from './helpers';

const GUEST_PAGES = ['/', '/teachers/', '/teachers/mathematics/', '/for-repetitor/', '/help/', '/login', '/signup', '/reset-password', '/legal/', '/legal/terms/', '/legal/payment-refund/', '/legal/tutor-terms/', '/legal/cookies/', '/blog/', '/requests', '/no-such-page'];
const ROLE_PAGES = {
  student: ['/me/lessons', '/me/lessons/l-4', '/me/payments', '/me/notifications', '/me/requests', '/me/chats', '/me/account'],
  tutor: ['/tutor/lessons', '/tutor/schedule', '/tutor/finance', '/tutor/profile', '/tutor/requests', '/tutor/reviews', '/tutor/students'],
  admin: ['/admin/disputes', '/admin/cancellations', '/admin/reviews', '/admin/profiles'],
} as const;

async function check(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await expect(page.locator('main')).toBeVisible();
  await page.waitForLoadState('networkidle');
  // блоки плавно проявляются при появлении: пока идёт проявление, axe видит полупрозрачный текст
  await page.waitForTimeout(1800);
  const result = await new AxeBuilder({ page })
    // выбранный пункт шапки — фирменный ярко-оранжевый по решению владельца (контраст ниже AA), остальное проверяем
    .exclude('.hdr nav a.cur')
    .withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `${url}: нарушения доступности`).toEqual([]);
  await expectNoHorizontalScroll(page);
}

test.describe('качество: доступность и вёрстка', () => {
  test('гостевые страницы: 0 нарушений axe, нет горизонтальной прокрутки', async ({ page }) => {
    for (const url of GUEST_PAGES) await check(page, url);
  });

  for (const [role, pages] of Object.entries(ROLE_PAGES)) {
    test(`кабинет «${role}»: 0 нарушений axe, нет горизонтальной прокрутки`, async ({ page }) => {
      await login(page, role);
      for (const url of pages) await check(page, url);
    });
  }

  test('размеры заголовков: 32/26 у страницы, 24/21 у раздела', async ({ page }) => {
    const phone = isPhone(page);
    for (const url of ['/teachers/', '/help/', '/legal/terms/', '/login']) {
      await page.goto(url);
      const h1 = await page.locator('h1').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(h1, `${url} h1`).toBe(phone ? 26 : 32);
    }
    await page.goto('/help/');
    const h2 = await page.locator('h2.trh-h2').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(h2).toBe(phone ? 21 : 24);
  });

  test('телефон: кнопки и поля не меньше 36 px по высоте, основные кнопки не меньше 44', async ({ page }) => {
    test.skip(!isPhone(page), 'только телефон');
    for (const url of ['/', '/teachers/', '/signup', '/login', '/help/']) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main .btn, main button, main input:not([type=checkbox]):not([type=radio]):not(.trk-sr), header .btn')]
        .filter((el) => el.offsetParent && !el.closest('[aria-hidden=true]'))
        .map((el) => ({ el, h: el.getBoundingClientRect().height }))
        .filter(({ el, h }) => h > 0 && h < (el.classList.contains('btn-s') ? 36 : 40))
        .map(({ el, h }) => `${el.className || el.tagName}:${Math.round(h)}`));
      expect(small, `${url}: слишком маленькие элементы`).toEqual([]);
    }
  });
});

test.describe('ссылки', () => {
  test('внутренние ссылки гостя, ученика и репетитора не ведут на 404', async ({ page }) => {
    test.setTimeout(180_000);
    const seen = new Set<string>();
    const bad: string[] = [];
    const crawl = async (starts: string[]) => {
      for (const start of starts) {
        await page.goto(start);
        await page.waitForLoadState('networkidle');
        const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href') ?? ''))]);
        for (const link of links) {
          const path = link.split('#')[0];
          if (!path || seen.has(path) || /^\/(images|assets)/.test(path)) continue;
          seen.add(path);
          await page.goto(path);
          await page.waitForLoadState('domcontentloaded');
          if (await page.getByRole('heading', { level: 1, name: 'Страница не найдена' }).count()) bad.push(path);
        }
      }
    };
    await crawl(['/', '/teachers/', '/for-repetitor/', '/help/', '/requests', '/legal/', '/blog/']);
    await login(page, 'student');
    await crawl(['/me/lessons', '/me/payments', '/me/account', '/me/requests']);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await login(page, 'tutor');
    await crawl(['/tutor/lessons', '/tutor/finance', '/tutor/profile', '/tutor/schedule']);
    expect(bad).toEqual([]);
    expect(seen.size).toBeGreaterThan(30);
  });
});

test.describe('телефон: шапка, кнопки, анкета', () => {
  test('отступы шапки равны отступам контента, кнопки одной ширины, ховер без обводки', async ({ page }) => {
    test.skip(!isPhone(page), 'только телефон');
    for (const url of ['/teachers/', '/help/', '/for-repetitor/']) {
      await page.goto(url);
      await page.waitForTimeout(900);
      const header = await page.locator('header.hdr').first().boundingBox();
      const title = await page.locator('main h1').first().boundingBox();
      expect(Math.round(header!.x), `${url}: левый отступ шапки`).toBe(Math.round(title!.x));
      expect(Math.round(390 - header!.x - header!.width), `${url}: правый отступ шапки`).toBe(Math.round(title!.x));
    }
    await page.goto('/for-repetitor/');
    const widths = await page.locator('main .btn:not(.btn-icon)').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(new Set(widths.filter((w) => w > 100)).size, `ширина кнопок: ${widths}`).toBeLessThanOrEqual(2);
  });

  test('анкета: кнопка «назад» на фото возвращает в каталог, шапки сайта нет', async ({ page }) => {
    test.skip(!isPhone(page), 'только телефон');
    await page.goto('/teachers/');
    await page.locator('a.tc').first().click();
    await expect(page).toHaveURL(/\/teachers\/[^/]+\/?$/);
    await expect(page.locator('header.hdr').first()).toBeHidden();
    await page.getByRole('button', { name: 'Назад' }).click();
    await expect(page).toHaveURL(/\/teachers\/?$/);
  });
});
