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
  {
    email,
    name = 'Ирина',
    role = 'student',
    password = PASSWORD,
    tz = 'Europe/Moscow',
  }: { email: string; name?: string; role?: 'student' | 'tutor'; password?: string; tz?: string },
): Promise<Account> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    data: { email, password, data: { name, role, tz } },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { access_token?: string; user?: { id: string }; id?: string };
  return { email, id: body.user?.id ?? body.id ?? '', token: body.access_token ?? '' };
}

export interface Account {
  email: string;
  id: string;
  /** access token of the new account (sign-up returns a session locally) */
  token: string;
}

/** PostgREST and rpc calls on behalf of an account, or as a guest without a token. */
export function rest(request: APIRequestContext, token?: string) {
  const headers = {
    apikey: ANON_KEY,
    authorization: `Bearer ${token ?? ANON_KEY}`,
    'content-type': 'application/json',
    prefer: 'return=representation',
  };
  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, data?: unknown) => {
    const res = await request.fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, data });
    const text = await res.text();
    return { ok: res.ok(), status: res.status(), body: (text ? JSON.parse(text) : null) as unknown };
  };
  return {
    get: (path: string) => call('GET', path),
    post: (path: string, data: unknown) => call('POST', path, data),
    patch: (path: string, data: unknown) => call('PATCH', path, data),
    rpc: (fn: string, args: unknown = {}) => call('POST', `rpc/${fn}`, args),
    del: (path: string) => call('DELETE', path),
  };
}

/** A fresh tutor signed in through the login form, landing on the summary.
    The default name is not one of the real tutors, so generated addresses never take theirs (supabase/tests use anna-kovaleva). */
export async function signInNewTutor(
  page: Page,
  request: APIRequestContext,
  info: TestInfo,
  { name = 'Анна Тестова', tz = 'Europe/Moscow' }: { name?: string; tz?: string } = {},
) {
  const account = await createUser(request, { email: uniqueEmail('tutor', info), role: 'tutor', name, tz });
  await page.goto('/login/');
  await logInInForm(page, account.email);
  await expect(page).toHaveURL(/\/tutor\/$/);
  return account;
}

/** Fills what publication needs straight through the API: photo path, a subject with a 60-minute price, weekly windows. */
export async function seedReadyTutor(request: APIRequestContext, tutor: Account, { windows = true }: { windows?: boolean } = {}) {
  const db = rest(request, tutor.token);
  const subject = (await db.get('subjects?slug=eq.math&select=id')).body as { id: number }[];
  const sid = subject[0].id;
  expect((await db.patch(`tutors?user_id=eq.${tutor.id}`, { photo_path: `${tutor.id}/seed.jpg`, experience_years: 5 })).ok).toBeTruthy();
  expect((await db.post('tutor_subjects', { tutor_id: tutor.id, subject_id: sid })).ok).toBeTruthy();
  expect((await db.post('prices', { tutor_id: tutor.id, subject_id: sid, duration_min: 60, price_rub: 2000 })).ok).toBeTruthy();
  if (windows) await seedWindows(request, tutor);
  return sid;
}

/** Every day 09:00–21:00 in the tutor's zone, so there are free slots whatever the clock. */
export async function seedWindows(request: APIRequestContext, tutor: Account) {
  const rows = [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ tutor_id: tutor.id, weekday, start_min: 540, end_min: 1260 }));
  const res = await rest(request, tutor.token).post('weekly_windows', rows);
  expect(res.ok, JSON.stringify(res.body)).toBeTruthy();
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

/** Leaves the shared local database as SQL tests expect it: no published e2e profiles and no live e2e bookings. */
export async function cleanUp(request: APIRequestContext, { tutor, student, booking }: { tutor?: Account; student?: Account; booking?: number }) {
  if (student && booking) await rest(request, student.token).rpc('cancel_booking', { p_id: booking });
  if (tutor) await rest(request, tutor.token).rpc('unpublish_tutor');
}

/* ---------- iteration 3: catalog and booking ---------- */

const CYR = 'абвгдежзиклмнопрстуфхэюя';
/** A word no other test or real tutor has, to find this test's tutors by name in a shared catalog. */
export function uniqueWord() {
  let w = '';
  for (let i = 0; i < 6; i++) w += CYR[Math.floor(Math.random() * CYR.length)];
  return w[0].toUpperCase() + w.slice(1);
}

export interface TutorSeed {
  name?: string;
  tz?: string;
  subjects?: { slug: string; prices: Record<number, number> }[];
  goals?: string[];
  exp?: number | null;
  /** weekly windows [weekday 1–7, start minute, end minute] in the tutor's zone; default every day 09:00–21:00 */
  windows?: [number, number, number][];
  horizonWeeks?: 1 | 2 | 4;
  minLeadHours?: 12 | 24;
}

export interface PublishedTutor extends Account {
  name: string;
  slug: string;
  subjectIds: Record<string, number>;
}

/** A published tutor with a readable address, prices and windows, made through the API. */
export async function publishedTutor(request: APIRequestContext, info: TestInfo, seed: TutorSeed = {}): Promise<PublishedTutor> {
  const name = seed.name ?? `Ника ${uniqueWord()}`;
  const account = await createUser(request, { email: uniqueEmail('cat-tutor', info), role: 'tutor', name, tz: seed.tz ?? 'Europe/Moscow' });
  const db = rest(request, account.token);
  const slug = `e2e-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const patch = await db.patch(`tutors?user_id=eq.${account.id}`, {
    slug,
    photo_path: `${account.id}/seed.jpg`,
    experience_years: seed.exp === undefined ? 5 : seed.exp,
    goals: seed.goals ?? [],
    horizon_weeks: seed.horizonWeeks ?? 2,
    min_lead_hours: seed.minLeadHours ?? 12,
  });
  expect(patch.ok, JSON.stringify(patch.body)).toBeTruthy();
  const subjects = seed.subjects ?? [{ slug: 'math', prices: { 60: 2000 } }];
  const all = (await db.get('subjects?select=id,slug')).body as { id: number; slug: string }[];
  const subjectIds: Record<string, number> = {};
  for (const s of subjects) {
    const sid = all.find(x => x.slug === s.slug)!.id;
    subjectIds[s.slug] = sid;
    expect((await db.post('tutor_subjects', { tutor_id: account.id, subject_id: sid })).ok).toBeTruthy();
    for (const [dur, price] of Object.entries(s.prices)) {
      const res = await db.post('prices', { tutor_id: account.id, subject_id: sid, duration_min: Number(dur), price_rub: price });
      expect(res.ok, JSON.stringify(res.body)).toBeTruthy();
    }
  }
  const windows = seed.windows ?? [1, 2, 3, 4, 5, 6, 7].map(d => [d, 540, 1260] as [number, number, number]);
  const win = await db.post('weekly_windows', windows.map(([weekday, start_min, end_min]) => ({ tutor_id: account.id, weekday, start_min, end_min })));
  expect(win.ok, JSON.stringify(win.body)).toBeTruthy();
  const pub = await db.rpc('publish_tutor');
  expect(pub.ok, JSON.stringify(pub.body)).toBeTruthy();
  return { ...account, name, slug, subjectIds };
}

/** Free starts of a tutor as the API gives them to everyone. */
export async function apiFreeSlots(request: APIRequestContext, tutorId: string, duration = 60) {
  return ((await rest(request).rpc('free_slots', { p_tutor: tutorId, p_duration: duration })).body as string[]).map(s => Date.parse(s));
}

export async function apiBook(request: APIRequestContext, student: Account, tutor: PublishedTutor, startsAt: number, { subject = 'math', duration = 60 } = {}) {
  const res = await rest(request, student.token).rpc('create_booking', {
    p_tutor: tutor.id,
    p_subject: tutor.subjectIds[subject],
    p_duration: duration,
    p_starts_at: new Date(startsAt).toISOString(),
  });
  expect(res.ok, JSON.stringify(res.body)).toBeTruthy();
  return Number(res.body);
}

/** Address of the booking form for a slot, as the profile builds it. */
export function bookPath(tutor: PublishedTutor, startsAt: number, { subject = 'math', duration = 60 } = {}) {
  return `/book/${tutor.slug}?subject=${subject}&dur=${duration}&slot=${encodeURIComponent(new Date(startsAt).toISOString())}`;
}

/** Signs a student in through the login page and waits for the cabinet. */
export async function signInStudent(page: Page, request: APIRequestContext, info: TestInfo, name = 'Ирина') {
  const account = await createUser(request, { email: uniqueEmail('student', info), name });
  await page.goto('/login/');
  await logInInForm(page, account.email);
  await expect(page).toHaveURL(/\/cabinet\/$/);
  return account;
}

/** Opens every page of the catalog grid. */
export async function showAll(page: Page) {
  const more = page.getByRole('button', { name: 'Показать ещё' });
  while (await more.isVisible()) await more.click();
}

/** Cancels live bookings (each as its student) and unpublishes tutors, so the shared database stays clean. */
export async function cleanBooking(request: APIRequestContext, { tutors = [], bookings = [] }: { tutors?: Account[]; bookings?: { student: Account; id: number }[] }) {
  for (const b of bookings) await rest(request, b.student.token).rpc('cancel_booking', { p_id: b.id });
  for (const t of tutors) await rest(request, t.token).rpc('unpublish_tutor');
}
