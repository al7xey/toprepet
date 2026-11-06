import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, login, logout } from './helpers';

test('JSON-LD каталога соответствует карточкам после поиска и очистки', async ({ page }) => {
  await page.goto('/teachers');
  const assertSchema = async () => {
    await expect(page.getByRole('region', { name: 'Преподаватели', exact: true })).toHaveAttribute('aria-busy', 'false');
    await expect.poll(async () => page.evaluate(() => {
      const pages = [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((tag) => JSON.parse(tag.textContent || '{}')).filter((schema) => schema['@type'] === 'CollectionPage');
      const cards = [...document.querySelectorAll<HTMLAnchorElement>('a.tc')].map((card) => new URL(card.href).pathname);
      const schema = pages[0];
      return pages.length === 1 && JSON.stringify(schema.mainEntity?.itemListElement.map((entry: { item: { url: string } }) => new URL(entry.item.url).pathname) ?? []) === JSON.stringify(cards);
    })).toBe(true);
  };
  await assertSchema();
  await page.getByRole('searchbox').fill('Анна');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.locator('a.tc').first()).toContainText('Анна');
  await assertSchema();
  await page.getByRole('searchbox').fill('несуществующий-преподаватель-123456789');
  await page.getByRole('button', { name: 'Найти', exact: true }).click();
  await expect(page.getByText('По вашему запросу преподавателей не нашлось', { exact: true })).toBeVisible();
  await assertSchema();
  await page.getByRole('button', { name: 'Показать всех' }).click();
  await expect(page.locator('a.tc').first()).toBeVisible();
  await assertSchema();
});

test('пустой каталог предлагает создать заявку только ученику', async ({ page }) => {
  for (const role of ['student', 'tutor', 'admin'] as const) {
    await login(page, role);
    await page.goto('/teachers?query=несуществующий-преподаватель-123456789');
    await expect(page.getByText('По вашему запросу преподавателей не нашлось', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Создать заявку', exact: true })).toHaveCount(role === 'student' ? 1 : 0);
    await logout(page);
  }
});

test('длинные данные анкеты не создают горизонтальную прокрутку', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'ширины задаются явно');
  await login(page, 'student');
  await page.goto('/teachers');
  await expect(page.locator('a.tc').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Преподаватели', exact: true })).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => {
    const key = 'toprepet-mock-v3';
    const state = JSON.parse(localStorage.getItem(key)!);
    const tutor = state.tutors.find((item: { id: string }) => item.id === 'english');
    tutor.name = 'А'.repeat(100);
    tutor.headline = 'Преподаватель' + 'Б'.repeat(150);
    tutor.intro = 'В'.repeat(300);
    tutor.rating = 4.9;
    localStorage.setItem(key, JSON.stringify(state));
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/teachers/english');
    await expect(page.locator('h1')).toHaveText('А'.repeat(100));
    await expectNoHorizontalScroll(page);
    const bounds = await page.locator('.trh-pf-sheet, .trh-pf h1, .trh-pf-role, .trh-pf-intro').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= -1 && box.right <= innerWidth + 1 && element.scrollWidth <= element.clientWidth + 1;
    }));
    expect(bounds.every(Boolean), 'содержимое анкеты не должно обрезаться даже при overflow-x:hidden').toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`long-profile-${width}.png`), fullPage: true });
    await page.goto('/teachers');
    const card = page.locator('a.tc').first();
    await expect(card).toContainText('А'.repeat(100));
    const name = card.locator('.trh-tutor-name');
    await expect(card.locator('.rt')).toHaveText('4,9');
    expect(await name.evaluate((element) => {
      const text = getComputedStyle(element);
      const row = getComputedStyle(element.parentElement!);
      return text.fontSize === row.fontSize && text.color === row.color;
    }), 'имя сохраняет типографику существующей карточки').toBe(true);
    expect(await name.evaluate((element) => element.getBoundingClientRect().right <= element.parentElement!.getBoundingClientRect().right)).toBe(true);
    await expectNoHorizontalScroll(page);
  }
});
