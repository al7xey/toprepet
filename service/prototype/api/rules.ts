import type { Lesson } from './types';
import { DAY, HOUR, MIN, MSK, now, zoned } from '../lib/time';

/* Business rules shared by the server logic and the screens. */
export const FREE_CANCEL_HOURS = 4;
export const CONFIRM_HOURS = 24;
export const CONFIRM_BEFORE_START_HOURS = 2;
export const NO_SHOW_AFTER_MIN = 15;
export const ANSWER_HOURS = 24; // «Урок состоялся?» and «Сообщить о проблеме»
export const RESERVE_MIN = 15;
export const SERIES_CHARGE_HOURS = 24;
export const REQUEST_DAYS = 14;
export const REQUEST_RESPONSES = 10;
export const UNREAD_EMAIL_MIN = 15;
export const DISPUTE_ANSWER_HOURS = 24;
export const FILE_LIMIT = 20 * 1024 * 1024;
export const PROMO_CODES: Record<string, number> = { ОСЕНЬ: 300, ЮТАНОВО: 300 };

export const confirmDeadline = (createdAt: number, start: number) => Math.min(createdAt + CONFIRM_HOURS * HOUR, start - CONFIRM_BEFORE_START_HOURS * HOUR);
export const freeCancelUntil = (l: Pick<Lesson, 'start'>) => l.start - FREE_CANCEL_HOURS * HOUR;
export const canCancelFree = (l: Pick<Lesson, 'start'>, at = now()) => at <= freeCancelUntil(l);
export const noShowFrom = (l: Pick<Lesson, 'start'>) => l.start + NO_SHOW_AFTER_MIN * MIN;
export const answerUntil = (l: Pick<Lesson, 'end'>) => l.end + ANSWER_HOURS * HOUR;

export const ACTIVE: Lesson['status'][] = ['pending', 'confirmed', 'unpaid'];

export type Phase =
  | 'pending'
  | 'unpaid'
  | 'upcoming'
  | 'live'
  | 'awaiting' // finished, waiting for «Урок состоялся?»
  | 'completed'
  | 'no_show'
  | 'disputed'
  | 'declined'
  | 'expired'
  | 'cancelled';

export function phase(l: Lesson, at = now()): Phase {
  switch (l.status) {
    case 'pending':
      return 'pending';
    case 'unpaid':
      return 'unpaid';
    case 'confirmed':
      if (at < l.start) return 'upcoming';
      if (at < l.end) return 'live';
      return l.kind === 'intro' ? 'completed' : 'awaiting';
    default:
      return l.status;
  }
}

export const isUpcoming = (l: Lesson, at = now()) => ['pending', 'unpaid', 'upcoming', 'live'].includes(phase(l, at));

/* add business days in Moscow time (Mon–Fri) */
export function addBusinessDays(ts: number, days: number) {
  let t = ts;
  let left = days;
  while (left > 0) {
    t += DAY;
    const wd = zoned(t, MSK).weekday;
    if (wd < 5) left--;
  }
  return t;
}

export const tokenTime = (ts: number) => `{t:${ts}}`;
