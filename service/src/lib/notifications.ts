/* У4.3 + У7.2: in-app notification texts. The same events go out as letters (supabase/functions/send-email/letters.ts). */
import { first, instrumental, past } from './names.ts';
import { fmtDay, fmtDayTime, fmtTime } from './time.ts';

export type NoteKind =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_autocancelled'
  | 'link_added'
  | 'link_missing'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'problem_reported'
  | 'problem_resolved';

export interface NoteContext {
  kind: string;
  /** who reads it */
  role: 'student' | 'tutor';
  tz: string;
  bookingId: number;
  startsAt: number;
  tutorName: string;
  studentName: string;
  /** for someone else: the participant's name, e.g. «Миша» */
  participantName: string | null;
  cancelledBy: 'student' | 'tutor' | 'system' | null;
}

/** One line of the notifications list and where it leads. */
export function noteText(n: NoteContext): { text: string; href: string } {
  const tutor = first(n.tutorName);
  const student = first(n.studentName);
  const who = n.participantName ? first(n.participantName) : student;
  const at = fmtDayTime(n.startsAt, n.tz);
  const day = fmtDay(n.startsAt, n.tz);
  const other = n.role === 'tutor' ? who : tutor;
  const lesson = n.role === 'tutor' ? `/tutor/lessons/${n.bookingId}` : `/cabinet/lessons/${n.bookingId}`;
  const text = ((): string => {
    switch (n.kind) {
      case 'booking_created':
        return `Новая запись: ${who}, ${at}`;
      case 'booking_confirmed':
        return `${tutor} ${past(tutor, 'подтвердил', 'подтвердила')} занятие ${at}`;
      case 'booking_declined':
        return `${tutor} ${past(tutor, 'отклонил', 'отклонила')} запись на ${day}`;
      case 'booking_cancelled':
        return n.role === 'tutor'
          ? `${student} ${past(student, 'отменил', 'отменила')} занятие ${at}`
          : `${tutor} ${past(tutor, 'отменил', 'отменила')} занятие ${at}`;
      case 'booking_autocancelled':
        return n.role === 'tutor' ? `Запись на ${day} отменена: вы не ответили` : `Запись на ${day} отменена: ${tutor} не ${past(tutor, 'ответил', 'ответила')}`;
      case 'link_added':
        return `${tutor} ${past(tutor, 'прислал', 'прислала')} ссылку на занятие ${at}`;
      case 'link_missing':
        return `Добавьте ссылку на занятие в ${fmtTime(n.startsAt, n.tz)}`;
      case 'reminder_24h':
        return `Напоминание: занятие ${day} в ${fmtTime(n.startsAt, n.tz)}`;
      case 'reminder_1h':
        return `Через час занятие с ${instrumental(other)}`;
      case 'problem_reported':
        return `Ученик сообщил о проблеме с занятием ${day}`;
      case 'problem_resolved':
        return `Решение по занятию ${day}`;
      default:
        return `Изменения в занятии ${at}`;
    }
  })();
  const href = n.role === 'tutor' && n.kind === 'booking_created' ? `/tutor/bookings/${n.bookingId}` : lesson;
  return { text, href };
}
