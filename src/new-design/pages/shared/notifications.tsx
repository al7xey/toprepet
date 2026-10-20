import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import type { Notification } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago } from '../../lib/format';
import { Button, Card, EmptyState, Icon, PageHeader, QueryView } from '../../ui';

const ICON: Record<Notification['kind'], string> = { lesson: 'cal', request: 'list', message: 'chat', payment: 'card', review: 'star', system: 'info' };

/** Уведомления: уроки, заявки, сообщения, платежи, отзывы. Общая страница для ученика и репетитора. */
export default function NotificationsPage() {
  const { user } = useSession();
  const role = user?.role === 'tutor' ? 'tutor' : 'student';
  const list = useQuery(user ? `notes-page-${user.id}` : null, () => api.listNotifications());
  const readAll = useMutation(() => api.markNotificationsRead());
  const unread = list.data?.some((n) => !n.read) ?? false;
  const markAll = async () => {
    await readAll.run();
    list.setData((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    window.dispatchEvent(new Event('tr:notes'));
  };
  return (
    <AppLayout role={role}>
      <PageHeader title="Уведомления" back={{ to: role === 'tutor' ? '/tutor/account' : '/me/account', label: 'Профиль' }} actions={unread ? <Button variant="fill" icon="checks" onClick={() => void markAll()} loading={readAll.pending}>Прочитать все</Button> : undefined} />
      <QueryView query={list} empty={(items) => items.length === 0 ? <EmptyState icon="bell" title="Пока тихо" text="Здесь появятся ответы на заявки, подтверждения уроков и сообщения." /> : null}>
        {(items) => (
          <div className="trk-list">
            {[...items].sort((a, b) => b.at.localeCompare(a.at)).map((n) => {
              const body = (
                <>
                  <span className="trk-note-ic"><Icon name={ICON[n.kind]} /></span>
                  <span className="trk-note-text"><b>{n.title}</b><span>{n.text}</span><small>{ago(n.at)}</small></span>
                  {!n.read && <span className="trk-note-dot" aria-label="Новое" />}
                </>
              );
              return <Card key={n.id} pad="sm">{n.link ? <Link className="trk-note-row" to={n.link}>{body}</Link> : <div className="trk-note-row">{body}</div>}</Card>;
            })}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
