import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listNotifications, markAllRead } from '../../api/notifications';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { fmtDayTime } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/** /cabinet/notifications/ (mockup notifications, У4.3 + У7.2): the same events that go out by letter.
    Unread ones keep their dot on this visit; opening the section resets the counter. */
export function Notifications() {
  usePageMeta('Уведомления', { noindex: true });
  const { profile } = useSession();
  const tz = useViewerZone();
  const key = profile?.id ?? '';
  const notes = useAsync(() => (profile ? listNotifications(profile, tz) : Promise.resolve([])), `${key}#${tz}`);
  const hasUnread = Boolean(notes.data?.some(n => n.unread));

  useEffect(() => {
    if (hasUnread) void markAllRead().catch(() => undefined);
  }, [hasUnread]);

  return (
    <>
      <h1 className="h1">Уведомления</h1>
      {notes.loading ? (
        <Loading />
      ) : notes.error || !notes.data ? (
        <LoadError title="Не получилось загрузить уведомления" onRetry={notes.reload} />
      ) : notes.data.length === 0 ? (
        <div className="card f">
          <b className="h3">Уведомлений пока нет</b>
          <p className="mut">Здесь появятся подтверждения, отмены, напоминания и&nbsp;ссылки на&nbsp;занятия. Те&nbsp;же новости придут письмом.</p>
        </div>
      ) : (
        <ul className="notes" aria-label="Уведомления">
          {notes.data.map(n => (
            <li key={n.id} className={n.unread ? 'unread' : undefined}>
              <Link className="li" to={n.href || '#'}>
                <span className="dot" aria-hidden="true" />
                <span className="t">
                  <b>{n.text}</b>
                  <span className="mut sm">
                    {fmtDayTime(n.createdAt, tz)}
                    {n.unread ? <span className="sr-only">, новое</span> : null}
                  </span>
                </span>
                <span />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
