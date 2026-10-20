import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import type { PaymentKind } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago, count, dateLong, rub } from '../../lib/format';
import { Avatar, Button, Card, Icon, IconButton, Modal, Note, PageHeader, Status, useToast, type Tone } from '../../ui';
import { RequestCard } from '../requests/parts';
import { RequestWizard } from '../requests/new';

const PAY: Record<PaymentKind, { tone: Tone; text: string; sign: string }> = {
  hold: { tone: 'wait', text: 'Заморожено', sign: '' },
  charge: { tone: 'ok', text: 'Списано', sign: '−' },
  release: { tone: 'neutral', text: 'Разморожено', sign: '' },
  refund: { tone: 'info', text: 'Возврат', sign: '+' },
};

/** Разделы репетитора, которых нет в нижнем меню: открываются из профиля. */
const TUTOR_SECTIONS = [
  { label: 'Анкета', to: '/tutor/profile', icon: 'school' },
  { label: 'Расписание', to: '/tutor/schedule', icon: 'clock' },
  { label: 'Доход и выплаты', to: '/tutor/finance', icon: 'wallet' },
  { label: 'Ученики', to: '/tutor/students', icon: 'person-plus' },
  { label: 'Отзывы', to: '/tutor/reviews', icon: 'star' },
];

/** Заголовок блока профиля: тот же уровень, что у заголовка страницы. Справа круглые кнопки: добавить и открыть весь раздел. */
function BlockHead({ title, add, all }: { title: string; add?: { label: string; onClick: () => void }; all: { label: string; to: string } }) {
  return (
    <div className="trk-block-head">
      <h2 className="trk-blocktitle trh-h1">{title}</h2>
      {add && <IconButton icon="plus" label={add.label} onClick={add.onClick} className="trk-addbtn" />}
      <IconButton icon="arrow" label={all.label} to={all.to} className="trh-more" />
    </div>
  );
}

/** Профиль: сводка по заявкам, уведомлениям и платежам. Карточка с именем и шестерёнка открывают настройки. */
export function AccountView({ role }: { role: 'student' | 'tutor' }) {
  const { user } = useSession();
  const [newRequest, setNewRequest] = useState(false);
  const toast = useToast();
  const past = useQuery(`account-lessons-${role}`, () => api.listLessons('past'));
  const reviews = useQuery(`account-reviews-${role}`, () => api.listMyReviews());
  const notes = useQuery(`account-notes-${role}`, () => api.listNotifications());
  const requests = useQuery(role === 'student' ? 'account-requests' : null, () => api.listMyRequests());
  const payments = useQuery(role === 'student' ? 'account-payments' : null, () => api.listPayments());
  const done = past.data?.filter((l) => l.status === 'completed').length ?? 0;
  const activeRequests = (requests.data ?? []).filter((r) => r.status === 'open');
  const latestNotes = [...(notes.data ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const latestPayments = [...(payments.data ?? [])].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const notesTo = role === 'tutor' ? '/tutor/notifications' : '/me/notifications';
  const settingsTo = role === 'tutor' ? '/tutor/account/settings' : '/me/account/settings';

  return (
    <AppLayout role={role}>
      <PageHeader title="Профиль" actions={<IconButton icon="settings" label="Настройки" to={settingsTo} />} />
      <div className="trk-account">
        <Link to={settingsTo} className="card trk-card pad-sm trk-account-hero" aria-label="Настройки профиля">
          <Avatar name={user?.name ?? '•'} photo={user?.photo ?? undefined} size={56} />
          <div className="trk-account-who">
            <h2 className="trk-account-name">{user?.name}</h2>
            <span className="muted">{user?.email}</span>
            <span className="muted sm">{count(done, 'занятие', 'занятия', 'занятий')} · {count(reviews.data?.length ?? 0, 'отзыв', 'отзыва', 'отзывов')}</span>
          </div>
          <Icon name="right" />
        </Link>

        {role === 'student' && (
          <section className="trk-block" aria-label="Мои заявки">
            <BlockHead title="Мои заявки" add={{ label: 'Новая заявка', onClick: () => setNewRequest(true) }} all={{ label: 'Все заявки', to: '/me/requests' }} />
            {requests.loading && !requests.data ? <span className="muted">Загружаем…</span> : activeRequests.length ? (
              <div className="trk-list">
                {activeRequests.slice(0, 2).map((r) => <RequestCard key={r.id} request={r} actions={<Button size="s" to={`/me/requests/${r.id}`}>{r.responsesCount ? `Отклики · ${r.responsesCount}` : 'Посмотреть отклики'}</Button>} />)}
              </div>
            ) : (
              <Card pad="sm"><div className="trk-form"><p className="muted">Активных заявок нет. Опишите, что нужно, и репетиторы сами откликнутся с ценой и временем.</p><Button icon="plus" onClick={() => setNewRequest(true)}>Создать заявку</Button></div></Card>
            )}
          </section>
        )}

        {role === 'tutor' && (
          <nav className="trk-navlist" aria-label="Разделы кабинета">
            {TUTOR_SECTIONS.map((s) => (
              <Link key={s.to} className="trk-navrow" to={s.to}><Icon name={s.icon} /><span>{s.label}</span><Icon name="right" /></Link>
            ))}
          </nav>
        )}

        <section className="trk-block" aria-label="Уведомления">
          <BlockHead title="Уведомления" all={{ label: 'Все уведомления', to: notesTo }} />
          {latestNotes.length ? (
            <div className="trk-navlist">
              {latestNotes.map((n) => (
                <Link key={n.id} className="trk-notice" to={n.link ?? notesTo}>
                  <span className="trk-notice-text"><b>{n.title}</b><span>{n.text}</span></span>
                  <small>{ago(n.at)}</small>
                  {!n.read && <span className="trk-note-dot" aria-label="Новое" />}
                </Link>
              ))}
            </div>
          ) : <span className="muted">Пока тихо: здесь появятся ответы на заявки, подтверждения уроков и сообщения.</span>}
        </section>

        {role === 'student' && (
          <section className="trk-block" aria-label="Платежи">
            <BlockHead title="Платежи" all={{ label: 'Все платежи', to: '/me/payments' }} />
            {latestPayments.length ? (
              <div className="trk-navlist">
                {latestPayments.map((p) => (
                  <Link key={p.id} className="trk-notice" to="/me/payments">
                    <span className="trk-notice-text"><b>{p.title}</b><span>{dateLong(p.at)}</span></span>
                    <span className="trk-right"><b className="tn">{PAY[p.kind].sign}{rub(p.amount)}</b><Status tone={PAY[p.kind].tone}>{PAY[p.kind].text}</Status></span>
                  </Link>
                ))}
              </div>
            ) : <span className="muted">Платежей пока нет. Они появятся после первой записи на урок.</span>}
          </section>
        )}

        {user && !user.emailVerified && (
          <Note tone="bad">Почта не подтверждена. <Button to="/verify-email" variant="line" size="s">Подтвердить</Button></Note>
        )}
      </div>

      <Modal open={newRequest} onClose={() => setNewRequest(false)} title="Новая заявка" width={640}>
        <RequestWizard embedded onDone={() => { setNewRequest(false); requests.reload(); toast('Заявка опубликована'); }} />
      </Modal>
    </AppLayout>
  );
}

export default function AccountPage() {
  return <AccountView role="student" />;
}
