import { Link, useSearchParams } from 'react-router-dom';
import { listTutorBookings, type Booking } from '../../api/booking';
import { useCounters } from '../../api/notifications';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { now } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { lessonPill, pupil, TutorCard } from './parts';

/** Bookings that became lessons: confirmed ones and those cancelled by a side (not declined, not cancelled for lack of an answer). */
const isLesson = (b: Booking) => b.status === 'confirmed' || b.status === 'completed' || (b.status === 'cancelled' && b.cancelledBy !== 'system');

/** /tutor/lessons/ (mockup tutorLessons, Р6.1): upcoming and past; lessons without a meeting link are marked. */
export function TutorLessons() {
  usePageMeta('Занятия', { noindex: true });
  const { profile } = useSession();
  const tz = useViewerZone();
  const [params] = useSearchParams();
  const tab = params.get('tab') === 'past' ? 'past' : 'upcoming';
  const id = profile?.id ?? '';
  const list = useAsync(() => listTutorBookings(id), id);
  const fresh = useCounters()?.fresh ?? [];
  const at = now();

  const lessons = (list.data ?? []).filter(isLesson);
  const shown =
    tab === 'past'
      ? lessons.filter(b => b.endsAt <= at).sort((a, b) => b.startsAt - a.startsAt)
      : lessons.filter(b => b.endsAt > at).sort((a, b) => a.startsAt - b.startsAt);

  return (
    <>
      <h1 className="h1">Занятия</h1>
      {list.loading ? (
        <Loading />
      ) : list.error || !list.data ? (
        <LoadError title="Не получилось загрузить занятия" onRetry={list.reload} />
      ) : (
        <>
          <nav className="tabs" aria-label="Занятия">
            <Link to="/tutor/lessons/" className={tab === 'upcoming' ? 'on' : undefined} aria-current={tab === 'upcoming' ? 'page' : undefined} replace>
              Ближайшие
            </Link>
            <Link to="/tutor/lessons/?tab=past" className={tab === 'past' ? 'on' : undefined} aria-current={tab === 'past' ? 'page' : undefined} replace>
              Прошедшие
            </Link>
          </nav>
          {shown.length ? (
            <ul className="stack" aria-label={tab === 'past' ? 'Прошедшие занятия' : 'Ближайшие занятия'}>
              {shown.map(b => (
                <li key={b.id}>
                  <TutorCard
                    b={b}
                    tz={tz}
                    to={`/tutor/lessons/${b.id}`}
                    what={`${pupil(b)} · ${b.subjectName}`}
                    pill={lessonPill(b, at)}
                    fresh={fresh.includes(b.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="card f">
              <b className="h3">{tab === 'past' ? 'Прошедших занятий пока нет' : 'Ближайших занятий нет'}</b>
              <p className="mut">
                {tab === 'past' ? 'Здесь будут прошедшие и отменённые занятия.' : 'Здесь будут подтверждённые занятия. Новые записи ждут ответа в разделе «Записи».'}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
