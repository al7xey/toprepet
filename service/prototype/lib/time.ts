/* Time helpers. All timestamps are UTC milliseconds; wall-clock values are always computed for an explicit IANA time zone. */

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const MSK = 'Europe/Moscow';

/* ---------- clock with a developer time machine ---------- */
const OFFSET_KEY = 'toprepet.service.timeOffset';
let offset = readOffset();
const clockListeners = new Set<() => void>();

function readOffset() {
  try {
    return Number(localStorage.getItem(OFFSET_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function now() {
  return Date.now() + offset;
}

export function timeOffset() {
  return offset;
}

export function setTimeOffset(value: number) {
  offset = value;
  try {
    localStorage.setItem(OFFSET_KEY, String(value));
  } catch {
    /* storage can be unavailable in private mode */
  }
  clockListeners.forEach(fn => fn());
}

export function onClockChange(fn: () => void) {
  clockListeners.add(fn);
  return () => clockListeners.delete(fn);
}

/* ---------- zoned parts ---------- */
export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Monday … 6 = Sunday
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hourCycle: 'h23',
    });
    partsCache.set(tz, f);
  }
  return f;
}

const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function zoned(ts: number, tz: string): ZonedParts {
  const out: Record<string, string> = {};
  for (const p of partsFormatter(tz).formatToParts(new Date(ts))) out[p.type] = p.value;
  return {
    year: +out.year,
    month: +out.month,
    day: +out.day,
    hour: +out.hour % 24,
    minute: +out.minute,
    weekday: WD[out.weekday] ?? 0,
  };
}

/* offset of a zone from UTC at a moment, in minutes */
export function tzOffsetMinutes(ts: number, tz: string) {
  const p = zoned(ts, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(ts / MIN) * MIN) / MIN);
}

/* wall clock in a zone → UTC timestamp */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess - tzOffsetMinutes(guess, tz) * MIN;
  ts = guess - tzOffsetMinutes(ts, tz) * MIN;
  return ts;
}

/* calendar date key YYYY-MM-DD in a zone */
export function dateKey(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function startOfDay(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, tz);
}

export function addDaysKey(key: string, days: number) {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function weekdayOfKey(key: string) {
  const { year, month, day } = parseDateKey(key);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/* ---------- formatting (Russian) ---------- */
export const NB = ' ';
const WD_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WD_LOWER = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTH_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export const weekdayShort = (i: number) => WD_SHORT[i];
export const weekdayLower = (i: number) => WD_LOWER[i];
export const monthName = (m: number) => MONTH_NOM[m - 1];
export const monthGen = (m: number) => MONTH_GEN[m - 1];
export const monthShort = (m: number) => MONTH_SHORT[m - 1];

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtTime(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/* «Чт 9 окт» */
export function fmtDay(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return `${WD_SHORT[p.weekday]}${NB}${p.day}${NB}${MONTH_SHORT[p.month - 1]}`;
}

/* «Чт 9 окт, 19:00» */
export function fmtDayTime(ts: number, tz: string) {
  return `${fmtDay(ts, tz)}, ${fmtTime(ts, tz)}`;
}

/* «9 октября» */
export function fmtDate(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return `${p.day}${NB}${MONTH_GEN[p.month - 1]}`;
}

/* «9 окт» */
export function fmtDateShort(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return `${p.day}${NB}${MONTH_SHORT[p.month - 1]}`;
}

/* «Чт 9 окт, 19:00–20:00» */
export function fmtRange(start: number, end: number, tz: string) {
  return `${fmtDayTime(start, tz)}–${fmtTime(end, tz)}`;
}

export function fmtDateKey(key: string) {
  const { month, day } = parseDateKey(key);
  return `${WD_SHORT[weekdayOfKey(key)]} ${day} ${MONTH_GEN[month - 1]}`;
}

/* relative «2 часа назад», «вчера» */
export function fmtAgo(ts: number, at = now(), tz = MSK) {
  const diff = at - ts;
  if (diff < MIN) return 'только что';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}${NB}${plural(Math.floor(diff / MIN), 'минуту', 'минуты', 'минут')} назад`;
  if (diff < 12 * HOUR) return `${Math.floor(diff / HOUR)}${NB}${plural(Math.floor(diff / HOUR), 'час', 'часа', 'часов')} назад`;
  const today = startOfDay(at, tz);
  if (ts >= today) return `сегодня в ${fmtTime(ts, tz)}`;
  if (ts >= today - DAY) return 'вчера';
  const days = Math.floor((today - ts) / DAY) + 1;
  if (days < 7) return `${days}${NB}${plural(days, 'день', 'дня', 'дней')} назад`;
  if (days < 30) return `${Math.floor(days / 7)}${NB}${plural(Math.floor(days / 7), 'неделю', 'недели', 'недель')} назад`;
  return fmtDateShort(ts, tz);
}

/* short time in chat list: «17:58», «вчера», «вт» */
export function fmtChatTime(ts: number, tz: string, at = now()) {
  const today = startOfDay(at, tz);
  if (ts >= today) return fmtTime(ts, tz);
  if (ts >= today - DAY) return 'вчера';
  if (ts >= today - 6 * DAY) return WD_LOWER[zoned(ts, tz).weekday];
  return fmtDateShort(ts, tz);
}

export function fmtDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}${NB}${plural(d, 'день', 'дня', 'дней')}${h % 24 ? ` ${h % 24}${NB}ч` : ''}`;
  }
  if (h && m) return `${h}${NB}ч ${m}${NB}мин`;
  if (h) return `${h}${NB}ч`;
  return `${m}${NB}мин`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export const countLabel = (n: number, one: string, few: string, many: string) => `${n}${NB}${plural(n, one, few, many)}`;

/* ---------- zones ---------- */
export const ZONES: { id: string; city: string }[] = [
  { id: 'Europe/Kaliningrad', city: 'Калининград' },
  { id: 'Europe/Moscow', city: 'Москва' },
  { id: 'Europe/Samara', city: 'Самара' },
  { id: 'Asia/Yekaterinburg', city: 'Екатеринбург' },
  { id: 'Asia/Omsk', city: 'Омск' },
  { id: 'Asia/Novosibirsk', city: 'Новосибирск' },
  { id: 'Asia/Krasnoyarsk', city: 'Красноярск' },
  { id: 'Asia/Irkutsk', city: 'Иркутск' },
  { id: 'Asia/Yakutsk', city: 'Якутск' },
  { id: 'Asia/Vladivostok', city: 'Владивосток' },
  { id: 'Asia/Magadan', city: 'Магадан' },
  { id: 'Asia/Kamchatka', city: 'Петропавловск-Камчатский' },
];

export function zoneCity(tz: string) {
  return ZONES.find(z => z.id === tz)?.city ?? tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
}

export function utcLabel(tz: string, at = now()) {
  const off = tzOffsetMinutes(at, tz);
  const h = Math.trunc(off / 60);
  const m = Math.abs(off % 60);
  return `UTC${h >= 0 ? '+' : '−'}${Math.abs(h)}${m ? ':' + pad(m) : ''}`;
}

/* «МСК+2» */
export function mskDiffLabel(tz: string, at = now()) {
  const diff = (tzOffsetMinutes(at, tz) - tzOffsetMinutes(at, MSK)) / 60;
  if (!diff) return 'МСК';
  return `МСК${diff > 0 ? '+' : '−'}${Math.abs(diff)}`;
}

/* difference in hours between two zones, signed */
export function zoneDiffHours(a: string, b: string, at = now()) {
  return (tzOffsetMinutes(at, a) - tzOffsetMinutes(at, b)) / 60;
}

export function guessZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || MSK;
  } catch {
    return MSK;
  }
}
