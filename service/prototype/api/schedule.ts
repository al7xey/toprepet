import type { Db, Lesson, TutorProfile } from './types';
import { DAY, HOUR, MIN, addDaysKey, dateKey, now, parseDateKey, weekdayOfKey, zoned, zonedToUtc, NB } from '../lib/time';

export const emptyWeek = () => Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false));

/* Statuses that keep a time window busy for the tutor. */
export const BUSY: Lesson['status'][] = ['pending', 'confirmed', 'unpaid'];

export function isClosed(tutor: TutorProfile, key: string) {
  return tutor.closed.some(r => key >= r.from && key <= r.to);
}

/* Hours open for booking on a calendar date in the tutor's zone. */
export function openHours(tutor: TutorProfile, key: string): Set<number> {
  const open = new Set<number>();
  if (isClosed(tutor, key)) return open;
  const wd = weekdayOfKey(key);
  tutor.weekly[wd]?.forEach((on, h) => on && open.add(h));
  for (const w of tutor.extra) if (w.date === key) for (let h = w.from; h < w.to; h++) open.add(h);
  return open;
}

function busyRanges(db: Db, tutorId: string, excludeLessonId?: string, forStudentId?: string, at = now()) {
  const ranges: [number, number][] = [];
  for (const l of db.lessons) {
    if (l.tutorId !== tutorId || l.id === excludeLessonId) continue;
    if (BUSY.includes(l.status)) ranges.push([l.start, l.end]);
    if (l.reschedule?.status === 'pending' && BUSY.includes(l.status)) ranges.push([l.reschedule.newStart, l.reschedule.newStart + l.minutes * MIN]);
  }
  for (const r of db.reservations ?? []) {
    if (r.tutorId !== tutorId || r.expiresAt <= at || r.studentId === forStudentId) continue;
    ranges.push([r.start, r.start + r.minutes * MIN]);
  }
  return ranges;
}

export interface SlotOptions {
  minutes: number;
  at?: number;
  ignoreHorizon?: boolean;
  ignoreNotice?: boolean;
  excludeLessonId?: string;
  forStudentId?: string; // the student's own reservation does not block the slot
  untilDays?: number; // look ahead limit when the horizon is ignored
}

/* Does a lesson of this length starting at `start` fit into the tutor's open hours? */
export function fitsOpenHours(tutor: TutorProfile, start: number, minutes: number) {
  const p = zoned(start, tutor.tz);
  if (p.minute % 30 !== 0) return false;
  const key = dateKey(start, tutor.tz);
  const open = openHours(tutor, key);
  const firstHour = p.hour;
  const lastMinute = p.hour * 60 + p.minute + minutes; // exclusive
  if (lastMinute > 24 * 60) return false;
  for (let h = firstHour; h * 60 < lastMinute; h++) if (!open.has(h)) return false;
  return true;
}

export function slotAvailable(db: Db, tutor: TutorProfile, start: number, o: SlotOptions) {
  const at = o.at ?? now();
  if (!o.ignoreNotice && start < at + tutor.minNoticeHours * HOUR) return false;
  if (start < at) return false;
  if (!o.ignoreHorizon && start > at + tutor.horizonWeeks * 7 * DAY) return false;
  if (!fitsOpenHours(tutor, start, o.minutes)) return false;
  const end = start + o.minutes * MIN;
  return !busyRanges(db, tutor.userId, o.excludeLessonId, o.forStudentId, at).some(([a, b]) => start < b && end > a);
}

/* All bookable starts, sorted. Starts are on the hour, like the tutor's grid. */
export function freeSlots(db: Db, tutor: TutorProfile, o: SlotOptions): number[] {
  const at = o.at ?? now();
  const days = o.ignoreHorizon ? (o.untilDays ?? 56) : tutor.horizonWeeks * 7 + 1;
  const busy = busyRanges(db, tutor.userId, o.excludeLessonId, o.forStudentId, at);
  const today = dateKey(at, tutor.tz);
  const out: number[] = [];
  for (let d = 0; d <= days; d++) {
    const key = addDaysKey(today, d);
    const open = openHours(tutor, key);
    if (!open.size) continue;
    const { year, month, day } = parseDateKey(key);
    for (const h of [...open].sort((a, b) => a - b)) {
      const start = zonedToUtc(year, month, day, h, 0, tutor.tz);
      if (start < at + (o.ignoreNotice ? 0 : tutor.minNoticeHours * HOUR)) continue;
      if (!o.ignoreHorizon && start > at + tutor.horizonWeeks * 7 * DAY) continue;
      if (!fitsOpenHours(tutor, start, o.minutes)) continue;
      const end = start + o.minutes * MIN;
      if (busy.some(([a, b]) => start < b && end > a)) continue;
      out.push(start);
    }
  }
  return out;
}

export function weeklyHoursCount(tutor: Pick<TutorProfile, 'weekly'>) {
  return tutor.weekly.reduce((sum, day) => sum + day.filter(Boolean).length, 0);
}

const DAY_NAMES = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

function ranges(hours: boolean[]) {
  const out: [number, number][] = [];
  let start = -1;
  for (let h = 0; h <= 24; h++) {
    if (hours[h] && start < 0) start = h;
    if (!hours[h] && start >= 0) {
      out.push([start, h]);
      start = -1;
    }
  }
  return out;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const fmtRanges = (r: [number, number][]) => r.map(([a, b]) => `${hh(a)}–${hh(b)}`).join(', ');

/* «Будни 18:00–22:00, суббота 10:00–14:00» */
export function describeWeekly(weekly: boolean[][]) {
  const parts: string[] = [];
  const same = (a: number, b: number) => fmtRanges(ranges(weekly[a])) === fmtRanges(ranges(weekly[b]));
  const weekdaysSame = [1, 2, 3, 4].every(i => same(0, i)) && ranges(weekly[0]).length > 0;
  let from = 0;
  if (weekdaysSame) {
    parts.push(`Будни ${fmtRanges(ranges(weekly[0]))}`);
    from = 5;
  }
  for (let d = from; d < 7; d++) {
    const r = ranges(weekly[d]);
    if (r.length) parts.push(`${parts.length ? DAY_NAMES[d] : DAY_NAMES[d][0].toUpperCase() + DAY_NAMES[d].slice(1)} ${fmtRanges(r)}`);
  }
  return parts.join(', ').replace(/(\d) /g, `$1${NB}`) || 'Время пока не открыто';
}

/* Which time buckets the tutor covers, in the tutor's own zone (good enough for filtering). */
export function coversBucket(tutor: TutorProfile, bucket: { from: number; to: number; weekend: boolean }) {
  const days = bucket.weekend ? [5, 6] : [0, 1, 2, 3, 4];
  return days.some(d => tutor.weekly[d].some((on, h) => on && h >= bucket.from && h < bucket.to));
}

/* group slot timestamps by date key in a zone */
export function groupByDay(slots: number[], tz: string) {
  const map = new Map<string, number[]>();
  for (const s of slots) {
    const k = dateKey(s, tz);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  return map;
}
