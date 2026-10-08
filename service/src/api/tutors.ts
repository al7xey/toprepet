import type { ClosedRange, Db, ExtraWindow, Payout, PriceItem, TutorDoc, TutorProfile, User } from './types';
import { getDb, mutate } from './store';
import { fail, notify, tutorById } from './core';
import { emptyWeek, weeklyHoursCount } from './schedule';
import { requireRole } from './auth';
import { SLUG_RE, slugify, uid } from '../lib/text';
import { dateKey, now } from '../lib/time';

export function uniqueSlug(d: Db, base: string, exceptUserId?: string) {
  const root = slugify(base) || 'repetitor';
  let slug = root;
  let n = 2;
  while (d.tutors.some(t => t.slug === slug && t.userId !== exceptUserId)) slug = `${root}-${n++}`;
  return slug;
}

export function createTutorDraft(d: Db, u: User): TutorProfile {
  return {
    userId: u.id,
    slug: uniqueSlug(d, u.name),
    name: u.name,
    tone: u.tone,
    about: '',
    education: '',
    experienceText: '',
    experienceYears: 0,
    achievements: [],
    approach: '',
    helpTopics: [],
    gender: '',
    city: '',
    tz: u.tz,
    subjects: [],
    formats: { online: true, atHome: false, atStudent: false, district: '' },
    services: ['Телемост'],
    intro: { enabled: true, minutes: 20 },
    prices: [],
    weekly: emptyWeek(),
    closed: [],
    extra: [],
    horizonWeeks: 2,
    minNoticeHours: 12,
    docs: [],
    published: false,
    visible: true,
    createdAt: now(),
    templates: [],
  };
}

/* ---------- readiness ---------- */
export interface Requirement {
  id: 'photo' | 'name' | 'price' | 'window';
  label: string;
  done: boolean;
}

export function hasOpenWindow(t: TutorProfile) {
  const today = dateKey(now(), t.tz);
  return weeklyHoursCount(t) > 0 || t.extra.some(w => w.date >= today);
}

export function requirements(t: TutorProfile): Requirement[] {
  const priced = t.subjects.some(s => t.prices.some(p => p.subject === s.subject && p.price > 0));
  return [
    { id: 'photo', label: 'Фото', done: !!t.photo },
    { id: 'name', label: 'Имя', done: t.name.trim().split(/\s+/).length >= 1 && t.name.trim().length > 1 },
    { id: 'price', label: 'Хотя бы один предмет с ценой', done: priced },
    { id: 'window', label: 'Хотя бы одно свободное окно', done: hasOpenWindow(t) },
  ];
}

export const isReady = (t: TutorProfile) => requirements(t).every(r => r.done);

/* Shown in the catalog: published, not paused and still meets the requirements. */
export const isListed = (t: TutorProfile) => t.published && t.visible && isReady(t);

export const docsVerified = (t: TutorProfile) => t.docs.some(doc => doc.status === 'ok');

export function chances(t: TutorProfile) {
  return [
    { id: 'about', label: 'Подробное «О себе»', done: t.about.trim().length >= 120, to: '/tutor/profile/edit?step=1' },
    { id: 'docs', label: 'Документы', done: docsVerified(t) || t.docs.some(doc => doc.status === 'review'), to: '/tutor/profile/documents' },
    { id: 'intro', label: 'Бесплатное знакомство', done: t.intro.enabled, to: '/tutor/profile/edit?step=2' },
    { id: 'education', label: 'Образование и опыт', done: !!t.education.trim() && !!t.experienceText.trim(), to: '/tutor/profile/edit?step=1' },
  ];
}

/* ---------- my profile ---------- */
export function myTutor(): TutorProfile {
  const me = requireRole('tutor');
  return tutorById(getDb(), me.id) ?? fail('Анкета не найдена');
}

function update(fn: (t: TutorProfile) => Partial<TutorProfile>) {
  const me = requireRole('tutor');
  return mutate(d => {
    const i = d.tutors.findIndex(t => t.userId === me.id);
    if (i < 0) fail('Анкета не найдена');
    const prev = d.tutors[i];
    const next = { ...prev, ...fn(prev), draftSavedAt: now() };
    d.tutors[i] = next;
    if (next.name !== prev.name || next.photo !== prev.photo) {
      const u = d.users.findIndex(x => x.id === me.id);
      d.users[u] = { ...d.users[u], name: next.name, photo: next.photo };
    }
    return next;
  });
}

export type TutorEditable = Partial<Pick<TutorProfile,
  'name' | 'photo' | 'about' | 'education' | 'experienceText' | 'experienceYears' | 'approach' | 'helpTopics' | 'gender' | 'city' |
  'subjects' | 'formats' | 'services' | 'intro' | 'weekly' | 'horizonWeeks' | 'minNoticeHours' | 'achievements'>>;

export function saveTutor(changes: TutorEditable) {
  return update(() => changes);
}

export function setPrices(prices: PriceItem[]) {
  for (const p of prices) if (p.price < 300 || p.price > 50000) fail('Цена должна быть от 300 до 50 000 ₽');
  return update(() => ({ prices }));
}

export function checkSlug(slug: string): { ok: boolean; message: string } {
  const me = requireRole('tutor');
  if (!SLUG_RE.test(slug)) return { ok: false, message: 'Латинские буквы, цифры и дефис, от 3 до 48 символов' };
  const taken = getDb().tutors.some(t => t.slug === slug && t.userId !== me.id);
  return taken ? { ok: false, message: 'Адрес занят, попробуйте другой' } : { ok: true, message: 'Адрес свободен. Сменить можно позже.' };
}

export function setSlug(slug: string) {
  const r = checkSlug(slug);
  if (!r.ok) fail(r.message, 'validation');
  return update(() => ({ slug }));
}

export function publish() {
  const t = myTutor();
  const missing = requirements(t).filter(r => !r.done);
  if (missing.length) fail(`Для публикации не хватает: ${missing.map(m => m.label.toLowerCase()).join(', ')}`);
  return update(() => ({ published: true, visible: true, publishedAt: t.publishedAt ?? now() }));
}

export function setVisible(visible: boolean) {
  return update(() => ({ visible }));
}

/* ---------- exceptions ---------- */
export function addClosed(from: string, to: string, note = '') {
  if (to < from) fail('Конец периода раньше начала');
  return update(t => ({ closed: [...t.closed, { id: uid('cl'), from, to, note } satisfies ClosedRange] }));
}
export function removeClosed(id: string) {
  return update(t => ({ closed: t.closed.filter(c => c.id !== id) }));
}
export function addExtra(date: string, from: number, to: number) {
  if (to <= from) fail('Окно должно заканчиваться позже, чем начинается');
  return update(t => ({ extra: [...t.extra.filter(w => !(w.date === date && w.from < to && w.to > from)), { id: uid('ex'), date, from, to } satisfies ExtraWindow] }));
}
export function removeExtra(id: string) {
  return update(t => ({ extra: t.extra.filter(w => w.id !== id) }));
}

/* ---------- documents ---------- */
export function uploadDoc(file: { name: string; size: number }, title = '') {
  if (file.size > 20 * 1024 * 1024) fail('Файл больше 20 МБ');
  if (!/\.(pdf|jpe?g|png|webp|heic)$/i.test(file.name)) fail('Подойдут фото или PDF');
  return update(t => ({ docs: [...t.docs, { id: uid('doc'), name: file.name, size: file.size, uploadedAt: now(), status: 'review', title } satisfies TutorDoc] }));
}
export function removeDoc(id: string) {
  return update(t => ({ docs: t.docs.filter(doc => doc.id !== id) }));
}

/* ---------- templates ---------- */
export function saveTemplate(title: string, text: string) {
  if (!title.trim() || !text.trim()) fail('Заполните название и текст шаблона');
  return update(t => ({ templates: [...t.templates.filter(x => x.title !== title.trim()), { id: uid('tpl'), title: title.trim(), text: text.trim() }] }));
}
export function deleteTemplate(id: string) {
  return update(t => ({ templates: t.templates.filter(x => x.id !== id) }));
}

/* ---------- payouts ---------- */
export function savePayout(p: Payout) {
  if (p.status === 'none') fail('Выплаты возможны только самозанятым и ИП. Оформите статус и вернитесь.');
  if (!/^\d{10}(\d{2})?$/.test(p.inn.replace(/\D/g, ''))) fail('ИНН — 12 цифр для самозанятого или 10–12 для ИП', 'validation');
  const digits = p.card.replace(/\D/g, '');
  if (digits.length < 16) fail('Введите номер карты полностью', 'validation');
  const masked = `${digits.slice(0, 4)} •••• ${digits.slice(-4)}`;
  const t = update(() => ({ payout: { ...p, inn: p.inn.replace(/\D/g, ''), card: masked } }));
  // retry failed transfers with the new card
  mutate(d => {
    d.transfers.forEach((tr, i) => {
      if (tr.tutorId === t.userId && tr.status === 'failed') d.transfers[i] = { ...tr, status: 'waiting', dueAt: now(), failReason: undefined };
    });
  });
  return t;
}

/* ---------- admin: documents ---------- */
export function reviewDoc(tutorId: string, docId: string, ok: boolean, reason = '') {
  requireRole('admin');
  if (!ok && !reason.trim()) fail('Укажите причину отказа');
  mutate(d => {
    const i = d.tutors.findIndex(t => t.userId === tutorId);
    if (i < 0) fail('Анкета не найдена');
    const t = d.tutors[i];
    d.tutors[i] = { ...t, docs: t.docs.map(doc => (doc.id === docId ? { ...doc, status: ok ? 'ok' : 'rejected', reason: ok ? undefined : reason } : doc)) };
    const doc = t.docs.find(x => x.id === docId);
    notify(d, tutorId, ok
      ? { icon: 'shield', title: 'Документ проверен', text: `${doc?.name}: в анкете появился значок «Документы проверены».`, to: '/tutor/profile/documents', tone: 'ok' }
      : { icon: 'warn', title: 'Документ отклонён', text: `${doc?.name}: ${reason}`, to: '/tutor/profile/documents', tone: 'bad' });
  });
}

/* the lowest price a student pays per 60 minutes */
export function priceFrom(t: TutorProfile) {
  const sixty = t.prices.filter(p => p.minutes === 60 && p.price > 0);
  const list = sixty.length ? sixty : t.prices.filter(p => p.price > 0);
  return list.length ? Math.min(...list.map(p => p.price)) : 0;
}
