import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Booking } from '../api/booking';
import { nextSlots } from '../api/catalog';
import { useAsync } from '../api/useAsync';
import { first } from '../lib/names';
import { selectionQuery } from '../lib/selection';
import { fmtDayTime, now } from '../lib/time';
import { slotName } from './Slots';

export const participant = (b: Pick<Booking, 'forOther' | 'participantName' | 'participantAge'>, own: string) =>
  b.forOther && b.participantName ? `${b.participantName}${b.participantAge ? `, ${b.participantAge} ${ageWord(b.participantAge)}` : ''}` : own;

function ageWord(n: number) {
  const a = n % 100;
  const b = n % 10;
  if (a > 10 && a < 20) return 'лет';
  if (b === 1) return 'год';
  if (b > 1 && b < 5) return 'года';
  return 'лет';
}

/** BookingSummary: tutor, subject and the facts of the lesson (mockups book, bookDone). */
export function LessonSummary({ b, tz, rows }: { b: Booking; tz: string; rows: [string, string][] }) {
  const name = first(b.tutorName);
  return (
    <section className="sum" aria-label="Ваше занятие">
      <span className="ttl">Ваше занятие</span>
      <div className="row nw">
        <span className="av" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <div className="stack s" style={{ gap: 0 }}>
          <b>{b.tutorName}</b>
          <span className="mut sm">{b.subjectName}</span>
        </div>
      </div>
      <dl className="dl">
        {[['Когда', fmtDayTime(b.startsAt, tz)] as [string, string], ...rows].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}


/** Facts of a lesson (mockups lessonPending … lessonDone, tutorLesson): rows [term, value]; empty values are left out. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="dl">
      {rows
        .filter(([, v]) => v !== null && v !== '')
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Avatar with a name and a second line (a link to the profile, a date, who booked). */
export function PersonRow({ name, sub }: { name: string; sub?: ReactNode }) {
  return (
    <div className="row nw">
      <span className="av l" aria-hidden="true">
        {first(name).slice(0, 1)}
      </span>
      <div className="stack s" style={{ gap: 0 }}>
        <b>{name}</b>
        {sub}
      </div>
    </div>
  );
}

/** Nearest free starts of the same tutor for the same length, each leading to the booking form (mockups lessonRejected, lessonAutoCancel). */
export function OtherSlots({ b, tz, title }: { b: Booking; tz: string; title: string }) {
  const slots = useAsync(() => (b.tutorSlug ? nextSlots(b.tutorId, b.durationMin, now()) : Promise.resolve([])), `${b.id}`);
  if (!b.tutorSlug || !slots.data?.length) return null;
  const slug = b.tutorSlug;
  return (
    <section className="stack" aria-label={title}>
      <b className="h3">{title}</b>
      <div className="slots">
        {slots.data.map(ts => (
          <Link
            key={ts}
            className="slot"
            to={`/book/${slug}${selectionQuery({ subject: b.subjectSlug, dur: b.durationMin, slot: ts })}`}
            aria-label={slotName(ts, tz, b.tutorTz, true)}
          >
            {fmtDayTime(ts, tz)}
          </Link>
        ))}
      </div>
    </section>
  );
}
