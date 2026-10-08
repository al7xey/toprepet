import type { Db, ID, Lesson, TutorProfile, User } from './types';
import { docsVerified, isListed, priceFrom } from './tutors';
import { tutorRating } from './reviews';
import { coversBucket, freeSlots } from './schedule';
import { DIRECTIONS, TIME_BUCKETS, goalsFor, shortSubject } from './catalog';
import { phase, isUpcoming } from './rules';
import { studentPrice } from '../lib/money';
import { DAY, now, startOfDay, zoned } from '../lib/time';

/* ---------- catalog filters, stored in the URL ---------- */
export interface CatalogFilters {
  q: string;
  subject: string;
  goal: string;
  dir: string;
  pmin: number | null;
  pmax: number | null;
  fmt: '' | 'online' | 'offline';
  time: string[];
  rating: 0 | 4.5 | 4.8;
  exp3: boolean;
  docs: boolean;
  intro: boolean;
  gender: '' | 'f' | 'm';
  age: '' | 'adult' | 'school' | 'preschool';
  sort: 'rec' | 'cheap' | 'pricey' | 'reviews';
}

export const EMPTY_FILTERS: CatalogFilters = { q: '', subject: '', goal: '', dir: '', pmin: null, pmax: null, fmt: '', time: [], rating: 0, exp3: false, docs: false, intro: false, gender: '', age: '', sort: 'rec' };

export function parseFilters(sp: URLSearchParams): CatalogFilters {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) || null : null);
  const r = Number(sp.get('rating'));
  return {
    q: sp.get('q') ?? '',
    subject: sp.get('subject') ?? '',
    goal: sp.get('goal') ?? '',
    dir: sp.get('dir') ?? '',
    pmin: num('pmin'),
    pmax: num('pmax'),
    fmt: (sp.get('fmt') as CatalogFilters['fmt']) || '',
    time: sp.get('time')?.split(',').filter(Boolean) ?? [],
    rating: r === 4.5 || r === 4.8 ? r : 0,
    exp3: sp.get('exp3') === '1',
    docs: sp.get('docs') === '1',
    intro: sp.get('intro') === '1',
    gender: (sp.get('gender') as CatalogFilters['gender']) || '',
    age: (sp.get('age') as CatalogFilters['age']) || '',
    sort: (sp.get('sort') as CatalogFilters['sort']) || 'rec',
  };
}

export function filtersToSearch(f: CatalogFilters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set('q', f.q);
  if (f.subject) sp.set('subject', f.subject);
  if (f.goal) sp.set('goal', f.goal);
  if (f.dir) sp.set('dir', f.dir);
  if (f.pmin) sp.set('pmin', String(f.pmin));
  if (f.pmax) sp.set('pmax', String(f.pmax));
  if (f.fmt) sp.set('fmt', f.fmt);
  if (f.time.length) sp.set('time', f.time.join(','));
  if (f.rating) sp.set('rating', String(f.rating));
  if (f.exp3) sp.set('exp3', '1');
  if (f.docs) sp.set('docs', '1');
  if (f.intro) sp.set('intro', '1');
  if (f.gender) sp.set('gender', f.gender);
  if (f.age) sp.set('age', f.age);
  if (f.sort !== 'rec') sp.set('sort', f.sort);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function activeFilterCount(f: CatalogFilters) {
  return [f.goal, f.pmin || f.pmax, f.fmt, f.time.length, f.rating, f.exp3, f.docs, f.intro, f.gender, f.age].filter(Boolean).length;
}

const AGE_CATS: Record<string, string[]> = { adult: ['Взрослые', 'Студенты'], school: ['Школьники'], preschool: ['Дошкольники'] };

export interface CatalogItem {
  tutor: TutorProfile;
  price: number; // student price «от»
  rating: number;
  reviews: number;
  docs: boolean;
  score: number;
}

function matchText(t: TutorProfile, q: string) {
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  if (!words.length) return true;
  const hay = [t.name, ...t.subjects.map(s => s.subject), ...t.subjects.flatMap(s => s.goals), ...t.helpTopics, t.about].join(' ').toLowerCase();
  // subject words must match; the rest only raises the score
  return words.some(w => hay.includes(w.slice(0, Math.max(3, w.length - 2))));
}

function priceForSubject(t: TutorProfile, subject: string) {
  if (!subject) return priceFrom(t);
  const list = t.prices.filter(p => p.subject === subject && p.price > 0);
  const sixty = list.filter(p => p.minutes === 60);
  const pick = sixty.length ? sixty : list;
  return pick.length ? Math.min(...pick.map(p => p.price)) : 0;
}

export function passes(d: Db, t: TutorProfile, f: CatalogFilters, skip?: keyof CatalogFilters | 'price') {
  if (!isListed(t)) return false;
  if (skip !== 'q' && f.q && !matchText(t, f.q)) return false;
  if (skip !== 'subject' && f.subject && !t.subjects.some(s => s.subject === f.subject)) return false;
  if (skip !== 'dir' && f.dir) {
    const dir = DIRECTIONS.find(x => x.id === f.dir);
    if (dir && !t.subjects.some(s => dir.subjects.includes(s.subject))) return false;
  }
  if (skip !== 'goal' && f.goal && !t.subjects.some(s => (!f.subject || s.subject === f.subject) && s.goals.includes(f.goal))) return false;
  const price = studentPrice(priceForSubject(t, f.subject));
  if (skip !== 'price' && f.pmin && price < f.pmin) return false;
  if (skip !== 'price' && f.pmax && price > f.pmax) return false;
  if (skip !== 'fmt' && f.fmt === 'online' && !t.formats.online) return false;
  if (skip !== 'fmt' && f.fmt === 'offline' && !t.formats.atHome && !t.formats.atStudent) return false;
  if (skip !== 'time' && f.time.length) {
    const buckets = TIME_BUCKETS.filter(b => f.time.includes(b.id));
    if (!buckets.some(b => coversBucket(t, b))) return false;
  }
  if (skip !== 'rating' && f.rating) {
    const r = tutorRating(d, t.userId);
    if (!r.count || r.avg < f.rating) return false;
  }
  if (skip !== 'exp3' && f.exp3 && t.experienceYears < 3) return false;
  if (skip !== 'docs' && f.docs && !docsVerified(t)) return false;
  if (skip !== 'intro' && f.intro && !t.intro.enabled) return false;
  if (skip !== 'gender' && f.gender && t.gender !== f.gender) return false;
  if (skip !== 'age' && f.age && !t.subjects.some(s => s.students.some(c => AGE_CATS[f.age].includes(c)))) return false;
  return true;
}

export function searchTutors(d: Db, f: CatalogFilters): CatalogItem[] {
  const items = d.tutors.filter(t => passes(d, t, f)).map(t => {
    const r = tutorRating(d, t.userId);
    const docs = docsVerified(t);
    const price = studentPrice(priceForSubject(t, f.subject));
    const score = (r.count ? r.avg : 4.6) * Math.log(r.count + 3) + (docs ? 0.6 : 0) + (t.intro.enabled ? 0.3 : 0) + (t.photo ? 0.5 : 0) + (t.about.length > 200 ? 0.2 : 0);
    return { tutor: t, price, rating: r.avg, reviews: r.count, docs, score };
  });
  const sorters: Record<CatalogFilters['sort'], (a: CatalogItem, b: CatalogItem) => number> = {
    rec: (a, b) => b.score - a.score,
    cheap: (a, b) => a.price - b.price,
    pricey: (a, b) => b.price - a.price,
    reviews: (a, b) => b.reviews - a.reviews || b.rating - a.rating,
  };
  return items.sort(sorters[f.sort]);
}

/* For «ничего не нашлось»: which filter to drop and how many tutors come back. */
export function relaxations(d: Db, f: CatalogFilters) {
  const keys: { key: keyof CatalogFilters | 'price'; label: string; reset: Partial<CatalogFilters> }[] = [];
  if (f.pmin || f.pmax) keys.push({ key: 'price', label: f.pmax ? `до ${f.pmax.toLocaleString('ru-RU')} ₽` : `от ${f.pmin?.toLocaleString('ru-RU')} ₽`, reset: { pmin: null, pmax: null } });
  if (f.time.length) keys.push({ key: 'time', label: TIME_BUCKETS.filter(b => f.time.includes(b.id)).map(b => b.label).join(', '), reset: { time: [] } });
  if (f.goal) keys.push({ key: 'goal', label: f.goal, reset: { goal: '' } });
  if (f.rating) keys.push({ key: 'rating', label: `рейтинг ${String(f.rating).replace('.', ',')}+`, reset: { rating: 0 } });
  if (f.docs) keys.push({ key: 'docs', label: 'документы проверены', reset: { docs: false } });
  if (f.exp3) keys.push({ key: 'exp3', label: 'опыт от 3 лет', reset: { exp3: false } });
  if (f.intro) keys.push({ key: 'intro', label: 'знакомство', reset: { intro: false } });
  if (f.gender) keys.push({ key: 'gender', label: f.gender === 'f' ? 'женщина' : 'мужчина', reset: { gender: '' } });
  if (f.age) keys.push({ key: 'age', label: 'возраст ученика', reset: { age: '' } });
  if (f.fmt) keys.push({ key: 'fmt', label: f.fmt === 'online' ? 'онлайн' : 'очно', reset: { fmt: '' } });
  if (f.q) keys.push({ key: 'q', label: `«${f.q}»`, reset: { q: '' } });
  return keys
    .map(k => ({ ...k, gain: d.tutors.filter(t => passes(d, t, f, k.key)).length }))
    .filter(k => k.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
}

/* subjects people can pick in the catalog: only those somebody teaches */
export function catalogSubjects(d: Db) {
  const set = new Set<string>();
  d.tutors.filter(isListed).forEach(t => t.subjects.forEach(s => set.add(s.subject)));
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function catalogGoals(d: Db, subject: string) {
  if (subject) return goalsFor(subject);
  const set = new Set<string>();
  d.tutors.filter(isListed).forEach(t => t.subjects.forEach(s => s.goals.forEach(g => set.add(g))));
  return [...set];
}

export const cardSubjects = (t: TutorProfile) => t.subjects.slice(0, 2).map(s => shortSubject(s.subject)).join(' / ') || 'Предметы не выбраны';

/* ---------- lessons ---------- */
export function lessonsOf(d: Db, user: User) {
  return d.lessons.filter(l => (user.role === 'tutor' ? l.tutorId === user.id : l.studentId === user.id));
}

export function splitLessons(list: Lesson[], at = now()) {
  const upcoming = list.filter(l => isUpcoming(l, at)).sort((a, b) => a.start - b.start);
  const past = list.filter(l => !isUpcoming(l, at)).sort((a, b) => b.start - a.start);
  return { upcoming, past };
}

/* the next three free windows, for profile hints */
export function nearestSlots(d: Db, t: TutorProfile, minutes = 60, n = 3) {
  return freeSlots(d, t, { minutes }).slice(0, n);
}

/* ---------- money ---------- */
export function tutorFinance(d: Db, tutorId: ID, at = now(), tz = 'Europe/Moscow') {
  const p = zoned(at, tz);
  const monthStart = startOfDay(at, tz) - (p.day - 1) * DAY;
  const lessonsById = new Map(d.lessons.filter(l => l.tutorId === tutorId).map(l => [l.id, l]));
  let frozen = 0;
  let waiting = 0;
  let sent = 0;
  let disputed = 0;
  let disputeDecideBy = 0;
  for (const t of d.transfers.filter(x => x.tutorId === tutorId)) {
    const l = lessonsById.get(t.lessonId);
    if (t.status === 'sent' && (t.sentAt ?? 0) >= monthStart) sent += t.amount;
    if (t.status === 'disputed') {
      disputed += t.amount;
      const dp = d.disputes.find(x => x.lessonId === t.lessonId && x.status === 'open');
      if (dp) disputeDecideBy = Math.max(disputeDecideBy, dp.decideBy);
    }
    if (t.status === 'waiting' || t.status === 'failed') {
      if (l && phase(l, at) === 'upcoming') frozen += t.amount;
      else waiting += t.amount;
    }
  }
  return { frozen, waiting, sent, disputed, disputeDecideBy };
}

/* ---------- admin ---------- */
export function cancellationStats(d: Db, at = now()) {
  const from = at - 30 * DAY;
  return d.tutors
    .map(t => {
      const lessons = d.lessons.filter(l => l.tutorId === t.userId && l.createdAt >= from - 30 * DAY);
      const cancels = lessons.filter(l => l.cancel?.by === 'tutor' && l.cancel.at >= from);
      const late = cancels.filter(l => l.start - (l.cancel?.at ?? 0) < 4 * 3600_000);
      const last = cancels.sort((a, b) => (b.cancel?.at ?? 0) - (a.cancel?.at ?? 0))[0];
      const total = lessons.filter(l => ['confirmed', 'completed', 'cancelled', 'no_show', 'disputed'].includes(l.status)).length;
      return { tutor: t, total, cancels: cancels.length, late: late.length, share: total ? cancels.length / total : 0, lastReason: last?.cancel?.reason ?? '—', flag: late.length >= 2 || (total >= 5 && cancels.length / total > 0.2) };
    })
    .filter(r => r.total > 0 || r.cancels > 0)
    .sort((a, b) => Number(b.flag) - Number(a.flag) || b.cancels - a.cancels);
}
