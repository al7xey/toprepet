import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, login, logout } from './helpers';

// Navigation crawls retain failure screenshots without recording repeated bundles.
test.use({ trace: 'off' });

for (const width of [320, 768, 1920]) {
  test(`основные страницы всех ролей: ${width}px`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'ширины проверяются один раз');
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 960 });
    const check = async (paths: string[]) => {
      for (const path of paths) {
        await page.goto(path);
        await expect(page.locator('main')).toBeVisible();
        await page.waitForLoadState('networkidle');
        await expect(page.locator('main h1').first()).toBeVisible();
        expect(await page.title(), path).not.toContain('Страница не найдена');
        await expectNoHorizontalScroll(page);
      }
    };
    await check(['/', '/teachers', '/teachers/english', '/for-repetitor', '/help', '/blog', '/legal', '/legal/terms', '/legal/payment-refund', '/login', '/signup', '/reset-password']);
    for (const [role, paths] of Object.entries({
      student: ['/me/tutors', '/me/lessons', '/me/payments', '/me/notifications', '/me/chats', '/me/requests', '/me/account/settings'],
      tutor: ['/tutor/lessons', '/tutor/schedule', '/tutor/finance', '/tutor/students', '/tutor/profile', '/tutor/documents', '/tutor/reviews', '/tutor/chats', '/tutor/requests', '/tutor/account/settings'],
      admin: ['/admin/documents', '/admin/profiles', '/admin/reviews', '/admin/disputes', '/admin/cancellations'],
    })) {
      await logout(page); await login(page, role); await check(paths);
    }
    await page.screenshot({ path: testInfo.outputPath(`layout-${width}.png`), fullPage: true });
  });
}
