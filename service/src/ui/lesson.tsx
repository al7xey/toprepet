import type { Booking } from '../api/booking';
import { first } from '../lib/names';
import { fmtDayTime } from '../lib/time';

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

