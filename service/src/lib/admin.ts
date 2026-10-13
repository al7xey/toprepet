/* Admin area (А1, А2, А3): texts of the lesson history, problem kinds, the journal and the registry filters.
   Pure functions, covered by unit tests. */
import { first, past } from './names.ts';
import { addDaysKey, parseDateKey, zonedToUtc } from './time.ts';

export const PROBLEM_KIND: Record<string, string> = {
  no_show: 'Репетитор не пришёл',
  technical: 'Занятие не состоялось по технической причине',
  other: 'Другое',
};

/** «B-2048»: the lesson number as the mockups show it. */
export const lessonNo = (id: number) => `B-${id}`;

export type EventStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface HistoryEvent {
  at: number;
  actorId: string | null;
  from: EventStatus | null;
  to: EventStatus;
  note: string | null;
}

/** One line of the lesson history (mockup adminLesson): who did what. */
export function eventText(e: HistoryEvent, who: { studentId: string; studentName: string; tutorName: string }) {
  const tutor = first(who.tutorName);
  const byStudent = e.actorId === who.studentId;
  const reason = e.note ? `: «${e.note}»` : '';
  switch (e.to) {
    case 'pending':
      return 'запись создана, ждёт подтверждения';
    case 'confirmed':
      return `${tutor} ${past(tutor, 'подтвердил', 'подтвердила')}`;
    case 'declined':
      return `${tutor} ${past(tutor, 'отклонил', 'отклонила')}${reason}`;
    case 'cancelled':
      if (!e.actorId) return e.note === 'автоотмена' ? 'отменена автоматически: репетитор не ответил вовремя' : 'отменена автоматически';
      return byStudent ? `ученик отменил${reason}` : `${tutor} ${past(tutor, 'отменил', 'отменила')}${reason}`;
    case 'completed':
      if (e.note === 'решение по проблеме') return 'закрыто решением по проблеме';
      if (!e.actorId) return 'прошло, закрыто автоматически через 24 часа';
      return byStudent ? 'ученик подтвердил, что всё прошло хорошо' : 'прошло';
    default:
      return 'статус изменён';
  }
}

export type AdminAction = 'hide_tutor' | 'unhide_tutor' | 'block_user' | 'unblock_user' | 'resolve_problem';

/** A journal line (mockup adminUsers): «Светлана скрыла анкету Павла Ким: «Фото не соответствует правилам»». */
export function journalText(action: AdminAction, admin: string, target: string, reason: string) {
  const a = first(admin);
  const did = (m: string, f: string) => `${a} ${past(a, m, f)}`;
  const tail = `: «${reason}»`;
  switch (action) {
    case 'hide_tutor':
      return `${did('скрыл', 'скрыла')} анкету: ${target}${tail}`;
    case 'unhide_tutor':
      return `${did('вернул', 'вернула')} анкету: ${target}${tail}`;
    case 'block_user':
      return `${did('заблокировал', 'заблокировала')} аккаунт: ${target}${tail}`;
    case 'unblock_user':
      return `${did('разблокировал', 'разблокировала')} аккаунт: ${target}${tail}`;
    case 'resolve_problem':
      return `${did('решил', 'решила')} проблему по занятию ${target}${tail}`;
  }
}

/** Registry filter by status: the values admin_bookings() understands, with the pill texts of the cabinet. */
export const STATUS_FILTER: { id: string; label: string }[] = [
  { id: '', label: 'Все статусы' },
  { id: 'pending', label: 'Ждёт подтверждения' },
  { id: 'confirmed', label: 'Подтверждено' },
  { id: 'declined', label: 'Отклонено' },
  { id: 'cancelled', label: 'Отменено' },
  { id: 'completed', label: 'Прошло' },
];

/** A calendar day «2026-10-16» in a zone as [start, end) in ms, or null for an empty or broken value. */
export function dayRange(key: string, tz: string): [number, number] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const at = (k: string) => {
    const { year, month, day } = parseDateKey(k);
    return zonedToUtc(year, month, day, 0, 0, tz);
  };
  const start = at(key);
  return Number.isFinite(start) ? [start, at(addDaysKey(key, 1))] : null;
}

/** А3: a problem past its 3-working-day deadline is overdue (the row is highlighted). */
export const isOverdue = (dueAt: number, at: number) => dueAt <= at;
