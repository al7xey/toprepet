/// <reference types="node" />
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { firstLink, latestMailTo, sql, SUPABASE_URL } from './helpers';

/* Р1.1 (Р-8): scripts/seed-tutors.mjs moves the 10 tutors of the old site and invites them to set a password.
   The test runs it against the local stack with its own addresses and a slug suffix, so it never touches the real ones. */

const { tutors } = JSON.parse(readFileSync('supabase/seed/tutors.json', 'utf8')) as { tutors: { id: string; name: string; about: string }[] };

function serviceKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 })}`;
  const secret = process.env.SUPABASE_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long';
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

test.describe('Р1.1 перенос 10 анкет', () => {
  let emails: Record<string, string> = {};
  let dir = '';
  test.afterEach(async ({ request }) => {
    const list = Object.values(emails).map(e => `'${e}'`).join(',');
    if (list) {
      const paths = JSON.parse(sql(`select coalesce(json_agg(t.photo_path), '[]') from tutors t join profiles p on p.id = t.user_id where p.email in (${list}) and t.photo_path is not null`)) as string[];
      const key = serviceKey();
      if (paths.length)
        await request.delete(`${SUPABASE_URL}/storage/v1/object/tutor-photos`, { headers: { apikey: key, authorization: `Bearer ${key}` }, data: { prefixes: paths } });
      sql(`delete from auth.users where email in (${list})`);
    }
    if (dir) rmSync(dir, { recursive: true, force: true });
    emails = {};
  });

  test('Р1.1 10 текущих анкет заводятся заранее черновиками с фото и предметами, повторный запуск ничего не ломает, репетитор задаёт пароль по ссылке из письма и видит сводку', async ({ page }, info) => {
    test.setTimeout(90_000);
    const stamp = `${info.project.name}-${Date.now().toString(36)}`;
    emails = Object.fromEntries(tutors.map(t => [t.id, `seed-${t.id}-${stamp}@example.com`]));
    dir = mkdtempSync(join(tmpdir(), 'seed-tutors-'));
    writeFileSync(join(dir, 'emails.json'), JSON.stringify(emails));
    const run = () =>
      execFileSync('node', ['scripts/seed-tutors.mjs', '--slug-suffix', stamp], {
        encoding: 'utf8',
        env: { ...process.env, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: serviceKey(), TUTOR_EMAILS: join(dir, 'emails.json'), SITE_URL: 'http://127.0.0.1:5181' },
      });

    const first = run().trim().split('\n');
    expect(first).toHaveLength(10);
    for (const line of first) expect(line).toMatch(/^ok .*аккаунт создан, приглашение отправлено, фото/);

    const list = Object.values(emails).map(e => `'${e}'`).join(',');
    const rows = JSON.parse(
      sql(`select json_agg(json_build_object('email', p.email, 'role', p.role, 'name', p.name, 'slug', t.slug, 'status', t.status, 'photo', t.photo_path,
             'subjects', (select count(*) from tutor_subjects s where s.tutor_id = t.user_id), 'prices', (select count(*) from prices pr where pr.tutor_id = t.user_id)))
           from profiles p join tutors t on t.user_id = p.id where p.email in (${list})`),
    ) as { email: string; role: string; name: string; slug: string; status: string; photo: string | null; subjects: number; prices: number }[];
    expect(rows).toHaveLength(10);
    for (const t of tutors) {
      const row = rows.find(r => r.email === emails[t.id])!;
      expect(row, t.id).toMatchObject({ role: 'tutor', name: t.name, slug: `${t.id}-${stamp}`, status: 'draft', prices: 0 });
      expect(row.photo).toMatch(/\/site-.+\.webp$/);
      expect(row.subjects).toBeGreaterThan(0);
    }
    // the photo is in the bucket
    const english = rows.find(r => r.email === emails.english)!;
    const photo = await page.request.get(`${SUPABASE_URL}/storage/v1/object/public/tutor-photos/${english.photo}`);
    expect(photo.status()).toBe(200);
    expect(photo.headers()['content-type']).toBe('image/webp');

    // a second run finds everything in place
    for (const line of run().trim().split('\n')) expect(line).toMatch(/без изменений$/);

    // the letter leads to setting a password, then to the summary with what publication still needs
    const letter = await latestMailTo(page.request, emails.english);
    await page.goto(firstLink(letter.HTML));
    await expect(page).toHaveURL(/\/reset\/new\//);
    await expect(page.getByRole('heading', { name: 'Пароль для TopRepet' })).toBeVisible();
    await expect(page.getByText(emails.english)).toBeVisible();
    await page.getByLabel('Новый пароль').fill('new-secret-77');
    await page.getByLabel('Ещё раз').fill('new-secret-77');
    await page.getByRole('button', { name: /Сохранить и\sвойти/ }).click();
    await expect(page).toHaveURL(/\/tutor\/$/);
    const needs = page.getByRole('list', { name: 'Что нужно для публикации' });
    await expect(needs.locator('li[data-done="true"]')).toContainText(['Фото', 'Имя']);
    await expect(needs.locator('li[data-done="false"]')).toContainText([/Предмет с\sценой/, /Свободное время/]);
    await page.goto('/tutor/profile/');
    await expect(page.getByLabel('О себе')).toHaveValue(tutors[0].about);
  });
});
