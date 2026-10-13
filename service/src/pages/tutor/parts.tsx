import { Link } from 'react-router-dom';
import type { Booking } from '../../api/booking';
import { first } from '../../lib/names';
import { fmtDay, fmtDayTime, fmtTime, NB } from '../../lib/time';
import { participant } from '../../ui/lesson';
import { NewPill } from '../../ui/StatusPill';

/* Shared pieces of the tutor's bookings and lessons (iteration 4). */

/** Who the lesson is for: «Миша, 14 лет» when booked for someone else, otherwise the student's name. */
export const pupil = (b: Booking) => participant(b, b.studentName);
/** First name of the person the lesson is for: «Миша». */
export const pupilFirst = (b: Booking) => first(b.forOther && b.participantName ? b.participantName : b.studentName);

/** «Английский язык» → «английский» for short headings («Миша, английский»). */
export const subjectShort = (name: string) => name.replace(/ язык$/, '').toLowerCase();

/** «Пт 19:00»: a deadline within a day or two. */
export const weekdayTime = (ts: number, tz: string) => `${fmtDay(ts, tz).split(NB)[0]} ${fmtTime(ts, tz)}`;

/** Bookings waiting for the tutor's answer, nearest deadline first. */
export const waiting = (list: Booking[], at: number) =>
  list.filter(b => b.status === 'pending' && b.confirmDeadline > at).sort((a, b) => a.confirmDeadline - b.confirmDeadline);

/** Confirmed lessons that have not ended, by start. */
export const upcomingLessons = (list: Booking[], at: number) =>
  list.filter(b => b.status === 'confirmed' && b.endsAt > at).sort((a, b) => a.startsAt - b.startsAt);

/** What the tutor's lists show for a lesson. */
export function lessonPill(b: Booking, at: number) {
  if (b.problem?.status === 'open') return { text: 'На рассмотрении', cls: 'act' };
  if (b.status === 'cancelled') return { text: 'Отменено', cls: '' };
  if (b.status === 'declined') return { text: 'Отклонено', cls: 'bad' };
  if (b.status === 'completed' || (b.status === 'confirmed' && b.endsAt <= at)) return { text: 'Прошло', cls: '' };
  if (b.status === 'confirmed' && !b.meetingUrl) return { text: 'Нет ссылки', cls: 'act' };
  return { text: 'Подтверждено', cls: 'ok' };
}

/** A row of the tutor's lists (mockups tutorBookings, tutorLessons, tutorHome). */
export function TutorCard({
  b,
  tz,
  to,
  what,
  pill,
  fresh,
}: {
  b: Booking;
  tz: string;
  to: string;
  what: string;
  pill: { text: string; cls: string };
  fresh: boolean;
}) {
  return (
    <Link className="lcard" to={to}>
      <span className="av" aria-hidden="true">
        {pupilFirst(b).slice(0, 1)}
      </span>
      <div className="stack s" style={{ gap: 0 }}>
        <b className="ell">{fmtDayTime(b.startsAt, tz)}</b>
        <span className="mut sm ell">{what}</span>
      </div>
      <div className="r">
        <span className={`pill ${pill.cls}`}>{pill.text}</span>
        {fresh ? <NewPill /> : null}
      </div>
    </Link>
  );
}
