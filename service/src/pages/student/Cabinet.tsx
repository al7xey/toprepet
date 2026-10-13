import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { listMyBookings, type Booking } from '../../api/booking';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { first } from '../../lib/names';
import { fmtDayTime, now } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { StatusPill, shownStatus } from '../../ui/StatusPill';

/** У4.3: upcoming first (by start), past separately (newest first). A lesson is past once it has ended. */
export function splitLessons(list: Booking[], at: number) {
  const upcoming = list.filter(b => b.endsAt > at).sort((a, b) => a.startsAt - b.startsAt);
  const past = list.filter(b => b.endsAt <= at).sort((a, b) => b.startsAt - a.startsAt);
  return { upcoming, past };
}

/** «Мои занятия» (mockups cabinet, cabinetPast): statuses «Ждёт подтверждения», «Подтверждено», «Отклонено», «Отменено», «Прошло». */
export function Cabinet() {
  usePageMeta('Мои занятия', { noindex: true });
  const { profile } = useSession();
  const tz = useViewerZone();
  const [params] = useSearchParams();
  const { state } = useLocation() as { state: { toast?: string } | null };
  const tab = params.get('tab') === 'past' ? 'past' : 'upcoming';
  const id = profile?.id ?? '';
  const lessons = useAsync(() => listMyBookings(id), id);
  const at = now();

  return (
    <>
      <h1 className="h1">Мои занятия</h1>
      {state?.toast ? (
        <output className="toast">{state.toast}</output>
      ) : null}
      {lessons.loading ? (
        <Loading />
      ) : lessons.error || !lessons.data ? (
        <LoadError title="Не получилось загрузить занятия" onRetry={lessons.reload} />
      ) : lessons.data.length === 0 ? (
        <div className="card f">
          <b className="h3">Здесь появятся ваши занятия</b>
          <p className="mut">Найдите репетитора и&nbsp;запишитесь в&nbsp;свободное время.</p>
          <Link className="btn s p" to="/teachers/" style={{ justifySelf: 'start' }}>
            Найти репетитора
          </Link>
        </div>
      ) : (
        <Lists list={lessons.data} tab={tab} tz={tz} at={at} />
      )}
    </>
  );
}

function Lists({ list, tab, tz, at }: { list: Booking[]; tab: 'upcoming' | 'past'; tz: string; at: number }) {
  const { upcoming, past } = splitLessons(list, at);
  const shown = tab === 'past' ? past : upcoming;
  return (
    <>
      <nav className="tabs" aria-label="Занятия">
        <Link to="/cabinet/" className={tab === 'upcoming' ? 'on' : undefined} aria-current={tab === 'upcoming' ? 'page' : undefined} replace>
          Ближайшие
        </Link>
        <Link to="/cabinet/?tab=past" className={tab === 'past' ? 'on' : undefined} aria-current={tab === 'past' ? 'page' : undefined} replace>
          Прошедшие
        </Link>
      </nav>
      {shown.length ? (
        <ul className="stack" aria-label={tab === 'past' ? 'Прошедшие занятия' : 'Ближайшие занятия'}>
          {shown.map(b => (
            <li key={b.id}>
              <LessonCard b={b} tz={tz} at={at} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card f">
          <b className="h3">{tab === 'past' ? 'Прошедших занятий пока нет' : 'Ближайших занятий нет'}</b>
          <p className="mut">
            {tab === 'past' ? 'Здесь будут занятия, которые уже прошли, отменённые и отклонённые.' : 'Найдите репетитора и запишитесь в свободное время.'}
          </p>
        </div>
      )}
      <Link className="btn s" to="/teachers/">
        Найти репетитора
      </Link>
    </>
  );
}

function LessonCard({ b, tz, at }: { b: Booking; tz: string; at: number }) {
  const what = [b.tutorName, b.subjectName, b.forOther ? b.participantName : null].filter(Boolean).join(' · ');
  return (
    <Link className="lcard" to={`/cabinet/lessons/${b.id}`}>
      <span className="av" aria-hidden="true">
        {first(b.tutorName).slice(0, 1)}
      </span>
      <div className="stack s" style={{ gap: 0 }}>
        <b className="ell">{fmtDayTime(b.startsAt, tz)}</b>
        <span className="mut sm ell">{what}</span>
      </div>
      <div className="r">
        <StatusPill status={shownStatus(b, at)} />
      </div>
    </Link>
  );
}
