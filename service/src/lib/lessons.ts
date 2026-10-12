/* Rules of a lesson after booking (iteration 4). Pure functions; the database enforces the same limits in its functions. */
import { DAY, HOUR, MIN, NB } from './time.ts';

/** У7.3: a student's cancellation of a confirmed lesson closer than this to the start is «late». */
export const LATE_CANCEL_MS = 4 * HOUR;
/** У7.4: a confirmed lesson becomes «Прошло» by itself this long after its end; a problem can be reported until then. */
export const AUTO_COMPLETE_MS = DAY;

export interface LessonTimes {
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
  startsAt: number;
  endsAt: number;
}

/** У7.3-поздно: same rule as cancel_booking(): only a confirmed lesson, less than 4 hours before the start. */
export const isLateCancel = (b: LessonTimes, at: number) => b.status === 'confirmed' && b.startsAt - at < LATE_CANCEL_MS;

/** Last moment of a free cancellation. */
export const freeCancelUntil = (startsAt: number) => startsAt - LATE_CANCEL_MS;

/** When the lesson closes by itself (run_jobs), and the last moment to report a problem. */
export const autoCompleteAt = (endsAt: number) => endsAt + AUTO_COMPLETE_MS;

/** У7.2: reminders go 24 hours and 1 hour before the start. */
export const reminderTimes = (startsAt: number): [number, number] => [startsAt - DAY, startsAt - HOUR];

/** A confirmed lesson that has ended and still waits for «всё прошло хорошо» or a problem (У7.4, У7.5). */
export const awaitsReview = (b: LessonTimes, at: number) => b.status === 'confirmed' && b.endsAt <= at && at < autoCompleteAt(b.endsAt);

/** Р4.1 timer: «23 ч», «40 мин»; null once the deadline has passed. Rounded down, so it never promises more time than is left. */
export function timeLeft(deadline: number, at: number) {
  const ms = deadline - at;
  if (ms <= 0) return null;
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MIN))}${NB}мин`;
  return `${Math.floor(ms / HOUR)}${NB}ч`;
}

/** Р6.1: the check of set_meeting_url(), plus no spaces anywhere (the database lets one through right after the first host letter). */
const MEETING_URL = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function meetingUrlError(text: string): string | null {
  const url = text.trim();
  if (!url) return 'Вставьте ссылку на звонок.';
  if (!MEETING_URL.test(url) || /\s/.test(url)) return 'Ссылка должна начинаться с http:// или https://, например https://telemost.yandex.ru/j/…';
  return null;
}

/** «telemost.yandex.ru/j/4471…»: the address without the scheme, shortened for a card. */
export function shortUrl(url: string, max = 34) {
  const bare = url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  return bare.length > max ? `${bare.slice(0, max - 1)}…` : bare;
}
