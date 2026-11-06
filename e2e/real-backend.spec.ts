import { expect, test } from '@playwright/test';
import { login } from './helpers';

// These scenarios share a seeded database and change the same tutor profile.
test.describe.configure({ mode: 'serial' });

/**
 * Сквозной сценарий против настоящего Django: сайт собран с VITE_API_URL, база с демо-данными.
 * Запускается скриптом `bash backend/scripts/e2e.sh`; без E2E_API_URL пропускается.
 */
test.skip(!process.env.E2E_API_URL, 'нужен E2E_API_URL: запускайте через backend/scripts/e2e.sh');
test.skip(({ isMobile }) => isMobile, 'сценарий один, на компьютере');

test('Django: ошибка нового поиска скрывает старые карточки и позволяет повторить', async ({ page }) => {
  await page.goto('/teachers');
  await expect(page.locator('a.tc').first()).toBeVisible();
  const failedQuery = 'несуществующий-преподаватель-123456789';
  const endpoint = (url: URL) => url.pathname === '/tutors' && url.searchParams.get('query') === failedQuery;
  await page.route(endpoint, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Поиск временно недоступен' }) }));
  await page.getByRole('searchbox').fill(failedQuery);
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Поиск временно недоступен');
  await expect(page.locator('a.tc')).toHaveCount(0);
  await page.unroute(endpoint);
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByText('По вашему запросу преподавателей не нашлось', { exact: true })).toBeVisible();
  await expect(page.locator('a.tc')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('searchbox').fill('Алексей');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.locator('a.tc').first()).toContainText('Алексей');
});

test('Django: вход → запись → подтверждение репетитором → админ видит отмену', async ({ page, context }) => {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('olga@mail.ru');
  await page.locator('input[type=password]').fill('wrong-password');
  await page.locator('button[type=submit]').click();
  await expect(page.getByText('Неверная почта или пароль')).toBeVisible();

  await login(page, 'student');
  await expect(page).toHaveURL(/\/me\/lessons/);

  await page.goto('/teachers/english/');
  await page.locator('.slot:not(.off)').first().click();
  await page.getByRole('link', { name: /Записаться/ }).first().click();
  await expect(page).toHaveURL(/\/book\/english/);
  await page.getByText(/Согласен/).first().click();
  await page.getByRole('button', { name: 'Записаться', exact: true }).click();
  await expect(page).toHaveURL(/\/done/);

  await context.clearCookies();
  await login(page, 'tutor');
  await page.goto('/tutor/lessons');
  await page.getByRole('button', { name: 'Подтвердить' }).first().click();
  await expect(page.getByText(/Подтверждён|Подтверждено/).first()).toBeVisible();

  await context.clearCookies();
  await login(page, 'admin');
  await expect(page).toHaveURL(/\/admin/);
  await page.goto('/admin/cancellations');
  await expect(page.getByText('Заболел ребёнок')).toBeVisible();
});

test('Django: приватное фото чата загружается с cookie и недоступно гостю', async ({ page, request }) => {
  await login(page, 'student');
  await page.goto('/me/chats/c-1');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'orange'; ctx.fillRect(0, 0, 8, 8);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'private.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  const photo = page.locator('.tg-photo').last();
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const url = await photo.getAttribute('src');
  expect(url).toMatch(/\/conversations\/c-1\/messages\/.+\/image$/);
  const denied = await request.get(url!);
  expect(denied.status()).toBe(401);
});


test('Django: загрузка и проверка документа через кабинеты', async ({ page, context, request }) => {
  await login(page, 'tutor');
  await page.goto('/tutor/documents');
  await page.locator('input[type=file]').setInputFiles({ name: 'integration-proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF') });
  await expect(page.getByText('integration-proof', { exact: true })).toBeVisible();
  const file = page.locator('.trk-card').filter({ hasText: 'integration-proof' }).getByRole('link', { name: 'Скачать документ' });
  const url = await file.getAttribute('href');
  expect((await request.get(url!)).status()).toBe(401);
  await context.clearCookies();
  await login(page, 'admin');
  await page.goto('/admin/documents');
  const card = page.locator('.trk-card').filter({ hasText: 'integration-proof' });
  await card.getByRole('button', { name: 'Подтвердить документ' }).click();
  await expect(card.getByText('Проверен', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Обновить очередь' }).click();
  await expect(page.getByText('integration-proof', { exact: true })).toHaveCount(0);
  await context.clearCookies();
  await login(page, 'tutor');
  await page.goto('/tutor/documents');
  const ownCard = page.locator('.trk-card').filter({ hasText: 'integration-proof' });
  const docId = new URL(url!).pathname.split('/')[2];
  const deletion = '**/tutor/documents/' + docId;
  await page.route(deletion, (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Хранилище временно недоступно' }) }));
  await ownCard.getByRole('button', { name: 'Удалить документ' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(dialog.getByText('Хранилище временно недоступно')).toBeVisible();
  await dialog.getByRole('button', { name: 'Не сейчас' }).click();
  await page.unroute(deletion);
  await ownCard.getByRole('button', { name: 'Удалить документ' }).click();
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(ownCard).toHaveCount(0);
  expect((await page.request.get(url!)).status()).toBe(404);
});


test('Django: обновление очереди заменяет устаревший статус документа', async ({ page, context }) => {
  await login(page, 'tutor');
  const origin = new URL(page.url()).origin;
  const api = process.env.E2E_API_URL!;
  const changed = await page.request.patch(api + '/tutor/profile', { data: { headline: 'Обновлённая анкета для проверки' }, headers: { Origin: origin } });
  expect(changed.ok()).toBe(true);
  await page.goto('/tutor/documents');
  await page.locator('input[type=file]').setInputFiles({ name: 'status-refresh.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  const file = page.locator('.trk-card').filter({ hasText: 'status-refresh' }).getByRole('link', { name: 'Скачать документ' });
  const url = await file.getAttribute('href');
  const id = new URL(url!).pathname.split('/')[2];
  await context.clearCookies();
  await login(page, 'admin');
  await page.goto('/admin/profiles');
  const row = page.locator('.g8').filter({ has: page.getByText('status-refresh', { exact: true }) });
  await expect(row.getByText('Ожидает проверки')).toBeVisible();
  const reviewed = await page.request.post(api + '/admin/documents/' + id, { data: { approve: true }, headers: { Origin: origin } });
  expect(reviewed.ok()).toBe(true);
  await page.route('**/admin/profiles', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Очередь временно недоступна' }) }));
  await page.getByRole('button', { name: 'Обновить очередь' }).click();
  await expect(page.getByRole('alert').getByText('Очередь временно недоступна')).toBeVisible();
  await page.unroute('**/admin/profiles');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(row.getByText('Проверен', { exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Подтвердить документ' })).toHaveCount(0);
});

test('Django: сбой проверки входа не завершает сессию и допускает повтор', async ({ page }) => {
  await login(page, 'student');
  await page.route('**/auth/me', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Проверка входа временно недоступна' }) }));
  await page.goto('/me/payments');
  await expect(page.getByRole('alert')).toContainText('Проверка входа временно недоступна');
  expect(new URL(page.url()).pathname).toBe('/me/payments');
  await page.unroute('**/auth/me');
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Платежи', exact: true })).toBeVisible();
});

test('Django: отложенный ответ до входа не сбрасывает новую сессию', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/auth/me', async (route) => { await held; await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); });
  await login(page, 'student');
  await expect(page.getByRole('heading', { name: 'Мои уроки', exact: true })).toBeVisible();
  release();
  // Allow the deliberately delayed initial auth response to finish and React to commit.
  await page.waitForTimeout(350);
  await expect(page.getByRole('heading', { name: 'Мои уроки', exact: true })).toBeVisible();
});

test('Django: ошибка выхода видна и сессия остаётся действующей', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, 'student');
  await page.goto('/me/account/settings');
  await page.route('**/auth/logout', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Выход временно недоступен' }) }));
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(dialog).toContainText('Выход временно недоступен');
  await page.unroute('**/auth/logout');
  await dialog.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/me/payments');
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(errors).toEqual([]);
});
