import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { AppLayout } from '../../layout/layouts';
import { ago, count } from '../../lib/format';
import { Avatar, Button, Card, ErrorState, IconButton, LoadingList, Note, NavigationRow, PageHeader, UnreadDot, useToast } from '../../ui';
const STUDENT_SECTIONS = [
  { label: 'Мои заявки', to: '/me/requests', icon: 'list' },
  { label: 'Мои репетиторы', to: '/me/tutors', icon: 'book' },
  { label: 'Занятия', to: '/me/lessons', icon: 'clock' },
  { label: 'Сообщения', to: '/me/chats', icon: 'chat' },
  { label: 'Уведомления', to: '/me/notifications', icon: 'bell' },
  { label: 'Платежи', to: '/me/payments', icon: 'card' },
];

/** Разделы репетитора, которых нет в нижнем меню: открываются из профиля. */
const TUTOR_SECTIONS = [
  { label: 'Анкета', to: '/tutor/profile', icon: 'school' },
  { label: 'Расписание', to: '/tutor/schedule', icon: 'clock' },
  { label: 'Доход и выплаты', to: '/tutor/finance', icon: 'wallet' },
  { label: 'Ученики', to: '/tutor/students', icon: 'person-plus' },
  { label: 'Документы', to: '/tutor/documents', icon: 'doc' },
  { label: 'Отзывы', to: '/tutor/reviews', icon: 'star' },
];

/** Заголовок блока профиля: тот же уровень, что у заголовка страницы. Справа круглые кнопки: добавить и открыть весь раздел. */
function BlockHead({ title, add, all }: { title: string; add?: { label: string; onClick: () => void }; all: { label: string; to: string } }) {
  return (
    <div className="trk-block-head">
      <h2 className="trk-blocktitle trh-h1">{title}</h2>
      {add && <IconButton icon="plus" label={add.label} onClick={add.onClick} className="trk-addbtn" />}
      <IconButton icon="arrow" label={all.label} to={all.to} />
    </div>
  );
}

/** Профиль: сводка по заявкам, уведомлениям и платежам. Карточка с именем и шестерёнка открывают настройки. */
export function AccountView({ role }: { role: 'student' | 'tutor' }) {
  const { user } = useSession();
  const toast = useToast();
  const { pathname } = useLocation();
  const past = useQuery(`account-lessons-${role}`, () => api.listLessons('past'));
  const reviews = useQuery(`account-reviews-${role}`, () => api.listMyReviews());
  const notes = useQuery(role === 'tutor' ? `account-notes-${role}` : null, () => api.listNotifications());
  const done = past.data?.filter((l) => l.status === 'completed').length ?? 0;
  const latestNotes = [...(notes.data ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const notesTo = role === 'tutor' ? '/tutor/notifications' : '/me/notifications';
  const settingsTo = role === 'tutor' ? '/tutor/account/settings' : '/me/account/settings';

  return (
    <AppLayout role={role}>
      <PageHeader title="Профиль" actions={<IconButton icon="settings" label="Настройки" to={settingsTo} />} />
      <div className="trk-account">
        <Card pad="sm" className="trk-account-hero">
          <Link to={settingsTo} className="trk-account-identity" aria-label="Настройки профиля">
            <Avatar name={user?.name ?? '•'} photo={user?.photo} size={56} />
            <div className="trk-account-who">
              <h2 className="trk-account-name">{user?.name}</h2>
              <span className="muted">{user?.email}</span>
              <span className="muted sm">{count(done, 'занятие', 'занятия', 'занятий')} · {count(reviews.data?.length ?? 0, 'отзыв', 'отзыва', 'отзывов')}</span>
            </div>
          </Link>
          <IconButton icon="pen" label="Изменить личные данные" to={`${settingsTo}?section=data`} state={{ from: pathname }} />
        </Card>

        <nav className="trk-navlist" aria-label="Разделы кабинета">
          {(role === 'tutor' ? TUTOR_SECTIONS : STUDENT_SECTIONS).map((section) => (
            <NavigationRow key={section.to} icon={section.icon} to={section.to}>{section.label}</NavigationRow>
          ))}
        </nav>

        {role === 'tutor' && <section className="trk-block" aria-label="Уведомления">
          <BlockHead title="Уведомления" all={{ label: 'Все уведомления', to: notesTo }} />
          {notes.error ? <ErrorState text={notes.error} onRetry={notes.reload} /> : notes.loading && !notes.data ? <LoadingList rows={2} height={60} /> : latestNotes.length ? (
            <div className="trk-navlist">
              {latestNotes.map((n) => (
                <Link key={n.id} className="trk-notice" to={n.link ?? notesTo} state={{ from: pathname }} onClick={() => {
                  if (n.read) return;
                  notes.setData((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                  void api.markNotificationRead(n.id).then(() => window.dispatchEvent(new Event('tr:notes'))).catch(() => {
                    notes.setData((prev) => (prev ?? []).map((item) => item.id === n.id ? { ...item, read: false } : item));
                    toast('Не удалось отметить уведомление прочитанным');
                  });
                }}>
                  <span className="trk-notice-text"><b>{n.title}{!n.read && <UnreadDot />}</b><span>{n.text}</span></span>
                  <small>{ago(n.at)}</small>
                </Link>
              ))}
            </div>
          ) : <span className="muted">Пока тихо: здесь появятся ответы на заявки, подтверждения уроков и сообщения.</span>}
        </section>}

        {user && !user.emailVerified && (
          <Note tone="bad">Почта не подтверждена. <Button to="/verify-email" variant="line" size="s">Подтвердить</Button></Note>
        )}
      </div>


    </AppLayout>
  );
}

export default function AccountPage() {
  return <AccountView role="student" />;
}
