import { useSyncExternalStore } from 'react';
import type { Role, Tone, User } from './types';
import { getDb, mutate, subscribe } from './store';
import { fail, sendEmail, userById } from './core';
import { createTutorDraft } from './tutors';
import { hashPassword } from '../lib/sha256';
import { uid } from '../lib/text';
import { HOUR, MSK, guessZone, now } from '../lib/time';

/* ---------- session ---------- */
const SESSION_KEY = 'toprepet.service.session';
let sessionId: string | null = readSession();
const sessionListeners = new Set<() => void>();

function readSession() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setSession(id: string | null) {
  sessionId = id;
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  sessionListeners.forEach(l => l());
}

function subscribeSession(fn: () => void) {
  sessionListeners.add(fn);
  const off = subscribe(fn);
  return () => {
    sessionListeners.delete(fn);
    off();
  };
}

export function currentUser(): User | null {
  if (!sessionId) return null;
  return userById(getDb(), sessionId) ?? null;
}

export function useSession(): User | null {
  return useSyncExternalStore(subscribeSession, currentUser, currentUser);
}

export function requireUser(): User {
  return currentUser() ?? fail('Войдите, чтобы продолжить', 'auth');
}

export function requireRole(role: Role): User {
  const u = requireUser();
  if (u.role !== role) fail(role === 'tutor' ? 'Действие доступно только репетиторам' : role === 'admin' ? 'Нужны права администратора' : 'Действие доступно только ученикам', 'role');
  return u;
}

export function logout() {
  setSession(null);
}

export function loginAs(userId: string) {
  setSession(userId);
}

/* ---------- validation ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());

const TONES: Tone[] = ['teal', 'indigo', 'green', 'plum', 'sand', 'orange'];

function baseUser(role: Role, name: string, email: string): User {
  return {
    id: uid('u'),
    role,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    tz: role === 'admin' ? MSK : guessZone(),
    tone: TONES[Math.floor(Math.random() * TONES.length)],
    createdAt: now(),
    onboarding: role === 'student' ? { step: 0, done: false, forWhom: 'self' } : undefined,
    children: [],
    favorites: [],
    cards: [],
    settings: { emailUnread: true, lessonReminders: true },
    blocked: [],
    promoUsed: [],
  };
}

function emailTaken(email: string) {
  const e = email.trim().toLowerCase();
  return getDb().users.find(u => u.email === e);
}

function roleTakenMessage(existing: User) {
  return existing.role === 'student'
    ? 'Эта почта уже зарегистрирована как ученик. Чтобы преподавать, нужен отдельный аккаунт с другой почтой.'
    : existing.role === 'tutor'
      ? 'Эта почта уже зарегистрирована как репетитор. Войдите или используйте другую почту.'
      : 'Эта почта уже занята.';
}

export interface SignupInput {
  role: 'student' | 'tutor';
  name: string;
  email: string;
  password: string;
}

export function validateSignup(i: SignupInput) {
  const errors: Partial<Record<'name' | 'email' | 'password', string>> = {};
  if (!i.name.trim()) errors.name = i.role === 'tutor' ? 'Укажите имя и фамилию' : 'Как к вам обращаться?';
  else if (i.role === 'tutor' && i.name.trim().split(/\s+/).length < 2) errors.name = 'Укажите имя и фамилию, так вас увидят ученики';
  if (!isEmail(i.email)) errors.email = 'Проверьте почту: например, name@mail.ru';
  else {
    const taken = emailTaken(i.email);
    if (taken) errors.email = roleTakenMessage(taken);
  }
  if (i.password.length < 8) errors.password = 'Пароль должен быть не короче 8 символов';
  return errors;
}

export function signup(i: SignupInput) {
  const errors = validateSignup(i);
  if (Object.keys(errors).length) fail(Object.values(errors)[0]!, 'validation', errors);
  const user = mutate(d => {
    const u = { ...baseUser(i.role, i.name, i.email), passwordHash: hashPassword(i.email, i.password) };
    d.users.push(u);
    if (u.role === 'tutor') d.tutors.push(createTutorDraft(d, u));
    sendEmail(d, u.id, {
      subject: 'Добро пожаловать в TopRepet',
      title: `${u.name.split(' ')[0]}, аккаунт создан`,
      body: u.role === 'tutor' ? 'Заполните анкету в 4 шага: она появится в каталоге сразу после обязательных полей.' : 'Найдите репетитора в каталоге или опубликуйте заявку, и репетиторы откликнутся сами.',
      action: { label: u.role === 'tutor' ? 'Заполнить анкету' : 'Найти репетитора', to: u.role === 'tutor' ? '/tutor/profile/edit' : '/teachers' },
    });
    return u;
  });
  setSession(user.id);
  return user;
}

export function login(email: string, password: string) {
  const u = emailTaken(email);
  if (!u || !u.passwordHash) fail(u?.viaYandex ? 'Этот аккаунт создан через Яндекс ID. Войдите с Яндекс ID или восстановите пароль.' : 'Неверная почта или пароль', 'credentials');
  if (u!.passwordHash !== hashPassword(email, password)) fail('Неверная почта или пароль', 'credentials');
  setSession(u!.id);
  return u!;
}

/* ---------- Yandex ID ---------- */
export interface YandexProfile {
  name: string;
  email: string;
}

const YA_PENDING = 'toprepet.service.yandexPending';

/* Existing account → signed in. New e-mail → the profile is kept until the person chooses a role. */
export function yandexSignIn(p: YandexProfile): { user: User } | { needsRole: true; profile: YandexProfile } {
  if (!isEmail(p.email)) fail('Яндекс ID не передал почту');
  const u = emailTaken(p.email);
  if (u) {
    if (!u.viaYandex) mutate(d => {
      const i = d.users.findIndex(x => x.id === u.id);
      d.users[i] = { ...d.users[i], viaYandex: true };
    });
    setSession(u.id);
    return { user: u };
  }
  sessionStorage.setItem(YA_PENDING, JSON.stringify(p));
  return { needsRole: true, profile: p };
}

export function pendingYandex(): YandexProfile | null {
  try {
    const raw = sessionStorage.getItem(YA_PENDING);
    return raw ? (JSON.parse(raw) as YandexProfile) : null;
  } catch {
    return null;
  }
}

export function yandexSignUp(role: 'student' | 'tutor') {
  const p = pendingYandex() ?? fail('Сессия Яндекс ID истекла, войдите ещё раз');
  if (emailTaken(p.email)) fail(roleTakenMessage(emailTaken(p.email)!));
  const user = mutate(d => {
    const u = { ...baseUser(role, p.name, p.email), viaYandex: true };
    d.users.push(u);
    if (role === 'tutor') d.tutors.push(createTutorDraft(d, u));
    return u;
  });
  sessionStorage.removeItem(YA_PENDING);
  setSession(user.id);
  return user;
}

/* Real Yandex OAuth when a client id is configured; otherwise the demo form is used. */
export const YANDEX_CLIENT_ID = (import.meta.env.VITE_YANDEX_CLIENT_ID as string | undefined) || '';

export function yandexAuthorizeUrl(state: string) {
  const redirect = `${location.origin}/auth/yandex`;
  return `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(YANDEX_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}`;
}

export async function fetchYandexProfile(token: string): Promise<YandexProfile> {
  const res = await fetch('https://login.yandex.ru/info?format=json', { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) fail('Яндекс ID не ответил, попробуйте ещё раз');
  const info = (await res.json()) as { real_name?: string; display_name?: string; default_email?: string };
  return { name: info.real_name || info.display_name || 'Пользователь', email: info.default_email ?? '' };
}

/* ---------- password reset ---------- */
export function requestReset(email: string) {
  if (!isEmail(email)) fail('Проверьте почту: например, name@mail.ru', 'validation');
  const u = emailTaken(email);
  // Do not reveal whether the address exists; send only when it does.
  if (!u) return;
  mutate(d => {
    const token = uid('r') + uid();
    d.resets.push({ token, userId: u.id, expiresAt: now() + HOUR, used: false });
    sendEmail(d, u.id, {
      subject: 'Восстановление пароля',
      title: 'Задайте новый пароль',
      body: 'Ссылка действует 1 час. Если вы не запрашивали восстановление, просто удалите это письмо.',
      action: { label: 'Задать новый пароль', to: `/password/new?token=${token}` },
    });
  });
}

export function resetPassword(token: string, password: string) {
  const d0 = getDb();
  const r = d0.resets.find(x => x.token === token);
  if (!r || r.used) fail('Ссылка уже использована. Запросите новую.');
  if (r!.expiresAt < now()) fail('Ссылка устарела: она действует 1 час. Запросите новую.');
  if (password.length < 8) fail('Пароль должен быть не короче 8 символов', 'validation');
  const u = userById(d0, r!.userId) ?? fail('Аккаунт не найден');
  mutate(d => {
    const i = d.users.findIndex(x => x.id === u.id);
    d.users[i] = { ...d.users[i], passwordHash: hashPassword(u.email, password) };
    const j = d.resets.findIndex(x => x.token === token);
    d.resets[j] = { ...d.resets[j], used: true };
  });
  setSession(u.id);
}

/* ---------- account ---------- */
export function updateMe(changes: Partial<Pick<User, 'name' | 'tz' | 'settings' | 'photo'>>) {
  const me = requireUser();
  mutate(d => {
    const i = d.users.findIndex(x => x.id === me.id);
    d.users[i] = { ...d.users[i], ...changes };
    if (me.role === 'tutor' && changes.tz) {
      const t = d.tutors.findIndex(x => x.userId === me.id);
      if (t >= 0) d.tutors[t] = { ...d.tutors[t], tz: changes.tz };
    }
  });
}

export function changePassword(oldPassword: string, password: string) {
  const me = requireUser();
  if (me.passwordHash && me.passwordHash !== hashPassword(me.email, oldPassword)) fail('Текущий пароль не подходит', 'validation');
  if (password.length < 8) fail('Пароль должен быть не короче 8 символов', 'validation');
  mutate(d => {
    const i = d.users.findIndex(x => x.id === me.id);
    d.users[i] = { ...d.users[i], passwordHash: hashPassword(me.email, password) };
  });
}
