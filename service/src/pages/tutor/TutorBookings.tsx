import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { listTutorBookings, type Booking } from '../../api/booking';
import { useCounters } from '../../api/notifications';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { fmtMoney } from '../../lib/money';
import { now } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { pupil, TutorCard, upcomingLessons, waiting, weekdayTime } from './parts';

type Tab = 'waiting' | 'confirmed' | 'declined';
const TABS: { id: Tab; label: string; query: string }[] = [
  { id: 'waiting', label: 'Ждут решения', query: '' },
  { id: 'confirmed', label: 'Подтверждённые', query: '?tab=confirmed' },
  { id: 'declined', label: 'Отклонённые', query: '?tab=declined' },
];

/** Bookings that never became lessons: declined by the tutor or cancelled because nobody answered (У5.2). */
const declined = (list: Booking[]) =>
  list.filter(b => b.status === 'declined' || (b.status === 'cancelled' && b.cancelledBy === 'system')).sort((a, b) => b.startsAt - a.startsAt);

/** /tutor/bookings/ (mockup tutorBookings, Р4.1): new bookings on top, each with its answer deadline. */
export function TutorBookings() {
  usePageMeta('Записи', { noindex: true });
  const { profile } = useSession();
  const tz = useViewerZone();
  const [params] = useSearchParams();
  const { state } = useLocation() as { state: { toast?: string } | null };
  const tab: Tab = params.get('tab') === 'confirmed' ? 'confirmed' : params.get('tab') === 'declined' ? 'declined' : 'waiting';
  const id = profile?.id ?? '';
  const list = useAsync(() => listTutorBookings(id), id);
  const fresh = useCounters()?.fresh ?? [];
  const at = now();

  return (
    <>
      <h1 className="h1">Записи</h1>
      {state?.toast ? <output className="toast">{state.toast}</output> : null}
      {list.loading ? (
        <Loading />
      ) : list.error || !list.data ? (
        <LoadError title="Не получилось загрузить записи" onRetry={list.reload} />
      ) : (
        (() => {
          const groups: Record<Tab, Booking[]> = {
            waiting: waiting(list.data, at),
            confirmed: upcomingLessons(list.data, at),
            declined: declined(list.data),
          };
          const shown = groups[tab];
          return (
            <>
              <nav className="tabs" aria-label="Записи">
                {TABS.map(t => (
                  <Link key={t.id} to={`/tutor/bookings/${t.query}`} className={tab === t.id ? 'on' : undefined} aria-current={tab === t.id ? 'page' : undefined} replace>
                    {t.id === 'waiting' && groups.waiting.length ? `${t.label} · ${groups.waiting.length}` : t.label}
                  </Link>
                ))}
              </nav>
              {shown.length ? (
                <ul className="stack" aria-label={TABS.find(t => t.id === tab)!.label}>
                  {shown.map(b => (
                    <li key={b.id}>
                      <TutorCard
                        b={b}
                        tz={tz}
                        to={tab === 'waiting' ? `/tutor/bookings/${b.id}` : `/tutor/lessons/${b.id}`}
                        what={`${pupil(b)} · ${b.subjectName}, ${b.durationMin} мин · ${fmtMoney(b.priceRub)}`}
                        pill={
                          tab === 'waiting'
                            ? { text: `Ответьте до ${weekdayTime(b.confirmDeadline, tz)}`, cls: 'act' }
                            : tab === 'confirmed'
                              ? { text: 'Подтверждено', cls: 'ok' }
                              : b.status === 'declined'
                                ? { text: 'Отклонено', cls: 'bad' }
                                : { text: 'Отменено', cls: '' }
                        }
                        fresh={fresh.includes(b.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="card f">
                  <b className="h3">
                    {tab === 'waiting' ? 'Новых записей нет' : tab === 'confirmed' ? 'Подтверждённых записей нет' : 'Отклонённых записей нет'}
                  </b>
                  <p className="mut">
                    {tab === 'waiting'
                      ? 'Когда ученик запишется, запись появится здесь, и мы пришлём письмо.'
                      : tab === 'confirmed'
                        ? 'Здесь будут записи, которые вы подтвердили.'
                        : 'Здесь будут записи, которые вы отклонили или не успели подтвердить.'}
                  </p>
                </div>
              )}
            </>
          );
        })()
      )}
    </>
  );
}
