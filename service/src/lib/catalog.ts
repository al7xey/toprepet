/* Catalog filters (У1.1, У1.3): what the URL query holds, how it reads back and how active filters are labelled.
   Self-contained so the rules are unit-tested with node --test. */

export type Goal = 'school' | 'homework' | 'oge' | 'ege' | 'speaking' | 'preschool';
export type Days = 'weekday' | 'weekend';
export type Part = 'morning' | 'day' | 'evening';

export interface Filters {
  /** subject slug */
  subject: string | null;
  goal: Goal | null;
  /** highest price for 60 minutes */
  price: number | null;
  days: Days | null;
  parts: Part[];
  /** minimal experience in years */
  exp: number | null;
  /** free text: tutor name or subject */
  q: string;
}

export const EMPTY: Filters = { subject: null, goal: null, price: null, days: null, parts: [], exp: null, q: '' };

const NB = ' ';

export const GOAL_OPTIONS: { id: Goal; label: string }[] = [
  { id: 'school', label: 'Школьная программа' },
  { id: 'homework', label: 'Домашние задания' },
  { id: 'oge', label: 'ОГЭ' },
  { id: 'ege', label: 'ЕГЭ' },
  { id: 'speaking', label: 'Разговорный язык' },
  { id: 'preschool', label: 'Подготовка к школе' },
];
export const PRICE_OPTIONS = [1500, 2000, 2500] as const;
export const EXP_OPTIONS = [1, 3, 5] as const;
export const DAYS_OPTIONS: { id: Days; label: string }[] = [
  { id: 'weekday', label: 'Будни' },
  { id: 'weekend', label: 'Выходные' },
];
export const PART_OPTIONS: { id: Part; label: string; short: string }[] = [
  { id: 'morning', label: `Утро, до${NB}12:00`, short: 'утро' },
  { id: 'day', label: `День, 12–17`, short: 'день' },
  { id: 'evening', label: `Вечер, после${NB}17:00`, short: 'вечер' },
];

const money = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}₽`;
export const priceLabel = (n: number) => `до${NB}${money(n)}`;
export const expLabel = (n: number) => `от${NB}${n}${NB}${n === 1 ? 'года' : 'лет'}`;
export const goalLabel = (g: Goal) => GOAL_OPTIONS.find(o => o.id === g)?.label ?? g;

/** «Будни, вечер», «Выходные», «Утро, вечер» */
export function timeLabel(f: Pick<Filters, 'days' | 'parts'>) {
  const parts = PART_OPTIONS.filter(p => f.parts.includes(p.id)).map(p => p.short);
  const days = f.days ? DAYS_OPTIONS.find(d => d.id === f.days)!.label : '';
  const text = [days, ...parts].filter(Boolean).join(', ');
  return text ? text[0].toUpperCase() + text.slice(1) : '';
}

const isGoal = (v: string | null): v is Goal => GOAL_OPTIONS.some(g => g.id === v);
const isPart = (v: string): v is Part => PART_OPTIONS.some(p => p.id === v);
const pick = <T extends number>(list: readonly T[], v: string | null) => (list as readonly number[]).includes(Number(v)) ? (Number(v) as T) : null;

/** Reads filters from the address; unknown values are ignored, so an old or hand-made link never breaks the page. */
export function parseFilters(params: URLSearchParams): Filters {
  const days = params.get('days');
  return {
    subject: /^[a-z-]{2,30}$/.test(params.get('subject') ?? '') ? params.get('subject') : null,
    goal: isGoal(params.get('goal')) ? (params.get('goal') as Goal) : null,
    price: pick(PRICE_OPTIONS, params.get('price')),
    days: days === 'weekday' || days === 'weekend' ? days : null,
    parts: PART_OPTIONS.map(p => p.id).filter(p => (params.get('parts') ?? '').split(',').filter(isPart).includes(p)),
    exp: pick(EXP_OPTIONS, params.get('exp')),
    q: (params.get('q') ?? '').trim().slice(0, 80),
  };
}

export function filtersToParams(f: Filters) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.subject) p.set('subject', f.subject);
  if (f.goal) p.set('goal', f.goal);
  if (f.price) p.set('price', String(f.price));
  if (f.days) p.set('days', f.days);
  if (f.parts.length) p.set('parts', f.parts.join(','));
  if (f.exp) p.set('exp', String(f.exp));
  return p;
}

/** Filter groups counted on the «Фильтры N» button; the search text is not a filter. */
export function activeCount(f: Filters) {
  return [f.subject, f.goal, f.price, f.days || f.parts.length ? 1 : null, f.exp].filter(Boolean).length;
}

/** Narrowing filters beyond a subject or a search: with them an empty result is «по фильтрам», not «по запросу». */
export const hasNarrowing = (f: Filters) => Boolean(f.goal || f.price || f.days || f.parts.length || f.exp);

export type DropKey = 'q' | 'subject' | 'goal' | 'price' | 'time' | 'exp';

export function without(f: Filters, key: DropKey): Filters {
  switch (key) {
    case 'q':
      return { ...f, q: '' };
    case 'time':
      return { ...f, days: null, parts: [] };
    default:
      return { ...f, [key]: null };
  }
}

/** Active filters, each removable on its own (У1.3), labelled as on the filter buttons. */
export function activeFilters(f: Filters, subjectName: (slug: string) => string): { key: DropKey; label: string }[] {
  const out: { key: DropKey; label: string }[] = [];
  if (f.q) out.push({ key: 'q', label: f.q });
  if (f.subject) out.push({ key: 'subject', label: subjectName(f.subject) });
  if (f.goal) out.push({ key: 'goal', label: goalLabel(f.goal) });
  if (f.price) out.push({ key: 'price', label: priceLabel(f.price) });
  if (f.days || f.parts.length) out.push({ key: 'time', label: timeLabel(f) });
  if (f.exp) out.push({ key: 'exp', label: expLabel(f.exp) });
  return out;
}

/** Subjects from the reference list whose name contains the typed text, from 2 letters on; names that start with it go first. */
export function suggest<T extends { name: string }>(subjects: T[], text: string, limit = 6): T[] {
  const q = text.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits = subjects.filter(s => s.name.toLowerCase().includes(q));
  return [...hits.filter(s => s.name.toLowerCase().startsWith(q)), ...hits.filter(s => !s.name.toLowerCase().startsWith(q))].slice(0, limit);
}

/** У1.2: directions with tutors that are closest to a query that found nobody (shared word or first letters), then the most popular. */
export function nearbySubjects(withTutors: { name: string; count: number }[], query: string, limit = 3) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
  const score = (name: string) => {
    const n = name.toLowerCase().split(/\s+/);
    let s = 0;
    for (const w of words) for (const x of n) {
      if (x === w) s += 3;
      else if (x.slice(0, 3) === w.slice(0, 3)) s += 2;
      else if (x.slice(-4) === w.slice(-4)) s += 1;
    }
    return s;
  };
  return [...withTutors].sort((a, b) => score(b.name) - score(a.name) || b.count - a.count || a.name.localeCompare(b.name, 'ru')).slice(0, limit);
}
