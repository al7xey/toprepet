/* Weekly windows (Р3.1): minutes from local midnight in the tutor's zone, 30-minute grid, ISO weekdays 1–7.
   Self-contained so the rules are unit-tested with node --test. */

export const STEP = 30;
export const DAY_MIN = 1440;
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const LONG = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

export const dayShort = (weekday: number) => SHORT[weekday - 1];
export const dayLong = (weekday: number) => LONG[weekday - 1];

export interface Win {
  id?: number;
  weekday: number;
  start: number;
  end: number;
}

/** A live booking (pending or confirmed) projected onto the tutor's week. */
export interface Busy {
  weekday: number;
  start: number;
  end: number;
  status: 'pending' | 'confirmed';
}

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const fmtWin = (w: { start: number; end: number }) => `${fmtMin(w.start)}–${fmtMin(w.end)}`;

/** All grid times of a day, 00:00 … 24:00. */
export const GRID = Array.from({ length: DAY_MIN / STEP + 1 }, (_, i) => i * STEP);

export const sameWin = (a: Win, b: Win) => a.weekday === b.weekday && a.start === b.start && a.end === b.end;
export const overlaps = (a: { weekday: number; start: number; end: number }, b: { weekday: number; start: number; end: number }) =>
  a.weekday === b.weekday && a.start < b.end && b.start < a.end;

/** Text error for a new window, or null when it fits (Р3.1). */
export function windowError(list: Win[], w: Win): string | null {
  if (w.start % STEP || w.end % STEP || w.start < 0 || w.end > DAY_MIN) return 'Время задаётся с шагом 30 минут.';
  if (w.end <= w.start) return 'Конец окна должен быть позже начала.';
  const hit = list.find(x => overlaps(x, w));
  if (hit) return `Окно пересекается с ${fmtWin(hit)} в этот день. Измените время или удалите старое окно.`;
  return null;
}

export function sortWins(list: Win[]) {
  return [...list].sort((a, b) => a.weekday - b.weekday || a.start - b.start);
}

/** Toggles one 30-minute cell; the day's windows are rebuilt from its cells, keeping ids of windows that did not change. */
export function toggleCell(list: Win[], weekday: number, minute: number): Win[] {
  const cells = new Set<number>();
  for (const w of list) if (w.weekday === weekday) for (let m = w.start; m < w.end; m += STEP) cells.add(m);
  if (cells.has(minute)) cells.delete(minute);
  else cells.add(minute);
  const rebuilt: Win[] = [];
  let open: number | null = null;
  for (let m = 0; m <= DAY_MIN; m += STEP) {
    if (cells.has(m) && m < DAY_MIN) {
      if (open === null) open = m;
    } else if (open !== null) {
      rebuilt.push({ weekday, start: open, end: m });
      open = null;
    }
  }
  const before = list.filter(w => w.weekday === weekday);
  const kept = rebuilt.map(w => before.find(b => sameWin(b, w)) ?? w);
  return sortWins([...list.filter(w => w.weekday !== weekday), ...kept]);
}

export const cellIn = (w: { start: number; end: number }, minute: number) => minute >= w.start && minute < w.end;

/** Р3.1: a window with a live booking inside it cannot be changed or removed. */
export const windowLocked = (w: Win, busy: Busy[]) => busy.some(b => overlaps(w, b));

/** What a save would change: windows to delete and to insert. */
export function diffWins(saved: Win[], next: Win[]) {
  const remove = saved.filter(s => !next.some(n => sameWin(n, s)));
  const add = next.filter(n => !saved.some(s => sameWin(n, s)));
  return { remove, add };
}

/* ---------- bookings in the tutor's zone ---------- */
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function local(ts: number, tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    fmtCache.set(tz, f);
  }
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(new Date(ts))) p[part.type] = part.value;
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1;
  return { weekday, minute: (+p.hour % 24) * 60 + +p.minute };
}

/** A booking as weekday ranges in the tutor's zone; one that crosses midnight becomes two ranges. */
export function bookingRanges(startsAt: number, endsAt: number, tz: string, status: Busy['status']): Busy[] {
  const out: Busy[] = [];
  let from = startsAt;
  while (from < endsAt) {
    const { weekday, minute } = local(from, tz);
    const span = Math.min((endsAt - from) / 60_000, DAY_MIN - minute);
    out.push({ weekday, start: minute, end: minute + Math.ceil(span), status });
    from += span * 60_000;
  }
  return out;
}
