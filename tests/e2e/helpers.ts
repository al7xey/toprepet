/// <reference types="node" />
import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';

/* Local `supabase start` defaults; CI uses the same stack. */
export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const MAIL_URL = process.env.MAIL_API_URL ?? 'http://127.0.0.1:54324';
export const PASSWORD = 'secret-pass-1';

/** A fresh address per test and project, so runs never collide. */
export function uniqueEmail(prefix: string, info: TestInfo) {
  return `${prefix}-${info.project.name}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Creates an account through the Auth API (faster than the form when the form is not under test). */
export async function createUser(
  request: APIRequestContext,
  { email, name = 'Ирина', role = 'student', password = PASSWORD }: { email: string; name?: string; role?: 'student' | 'tutor'; password?: string },
) {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    data: { email, password, data: { name, role, tz: 'Europe/Moscow' } },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

export async function signUpInForm(page: Page, { name, email, password = PASSWORD }: { name: string; email: string; password?: string }) {
  await page.getByLabel('Имя').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
}

export async function logInInForm(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
}

/** Waits for the newest letter to an address in the local mail catcher and returns it. */
export async function latestMailTo(request: APIRequestContext, address: string) {
  let id = '';
  await expect
    .poll(
      async () => {
        const res = await request.get(`${MAIL_URL}/api/v1/messages`);
        const { messages = [] } = (await res.json()) as { messages?: { ID: string; To: { Address: string }[] }[] };
        id = messages.find(m => m.To.some(t => t.Address.toLowerCase() === address.toLowerCase()))?.ID ?? '';
        return id;
      },
      { timeout: 15_000 },
    )
    .not.toBe('');
  const res = await request.get(`${MAIL_URL}/api/v1/message/${id}`);
  return (await res.json()) as { Subject: string; HTML: string; Text: string };
}

export function firstLink(html: string) {
  const m = /href="([^"]+)"/.exec(html);
  if (!m) throw new Error('no link in the letter');
  return m[1].replace(/&amp;/g, '&');
}
