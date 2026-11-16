import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('на 320px кнопка кабинета не закрывает логотип и бургер', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await login(page, 'student');
  await page.goto('/');
  const header = page.locator('.trh-public-nav .hdr');
  await expect(header).toBeVisible();
  const boxes = await header.evaluate(node => ['.logo', '.trh-actions', '.trh-burger'].map(selector => {
    const rect = node.querySelector(selector)!.getBoundingClientRect();
    return { left: rect.left, right: rect.right };
  }));
  expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left);
  expect(boxes[1].right).toBeLessThanOrEqual(boxes[2].left);
});

test('после недоступного чанка сайт обновляется один раз и восстанавливает каталог', async ({ page }) => {
  let attempts = 0;
  await page.route(/\/assets\/teachers-page-[^/]+\.js$/, async route => {
    attempts += 1;
    if (attempts === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Найти репетитора', exact: true }).first().click();
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.locator('a.tc').first()).toBeVisible();
  expect(attempts).toBeGreaterThanOrEqual(2);
});

test('старое уведомление репетитора ведёт к рабочей ленте заявок', async ({ page }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/notifications');
  await page.getByRole('link', { name: /Новая заявка по вашему предмету/ }).click();
  await expect(page).toHaveURL(/\/tutor\/requests$/);
  await expect(page.getByRole('tab', { name: 'Новые заявки' })).toBeVisible();
});

test('неверный код не подтверждает почту, правильный открывает онбординг', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Имя', { exact: true }).fill('Проверка кода');
  await page.getByLabel('Почта', { exact: true }).fill('code-test@example.invalid');
  await page.getByLabel('Пароль', { exact: true }).fill('Strong-local-test-42!');
  await page.getByText(/Принимаю/).click();
  await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
  await expect(page).toHaveURL(/verify-email/);
  await page.goto('/me/account');
  await expect(page).toHaveURL(/verify-email\?next=/);
  const submit = page.getByRole('button', { name: 'Подтвердить почту', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel('Код из письма', { exact: true }).fill('000000');
  await submit.click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/verify-email/);
  await page.getByLabel('Код из письма', { exact: true }).fill('123 456');
  await expect(page.getByLabel('Код из письма', { exact: true })).toHaveValue('123456');
  await submit.click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
  await expect(page).toHaveURL(/\/me\/account$/);
});
