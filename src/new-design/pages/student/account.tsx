import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import type { PaymentKind } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago, count, dateLong, rub } from '../../lib/format';
import { Avatar, Button, Card, ConfirmDialog, FilePick, FormError, Icon, IconButton, Modal, Note, PageHeader, PasswordField, SelectField, Status, Switch, TextField, useToast, type Tone } from '../../ui';
import { RequestCard } from '../requests/parts';
import { RequestWizard } from '../requests/new';

const ZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (МСК−1)' },
  { value: 'Europe/Moscow', label: 'Москва (МСК)' },
  { value: 'Europe/Samara', label: 'Самара (МСК+1)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (МСК+2)' },
  { value: 'Asia/Omsk', label: 'Омск (МСК+3)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (МСК+4)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (МСК+4)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (МСК+5)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (МСК+7)' },
];

const PREFS = [
  { key: 'lessons', title: 'Записи и уроки', text: 'Подтверждения, переносы, отмены и итоги уроков' },
  { key: 'messages', title: 'Сообщения', text: 'Когда вам пишут в чате' },
  { key: 'reminders', title: 'Напоминания', text: 'За день и за час до урока' },
] as const;
type PrefKey = (typeof PREFS)[number]['key'];
const DEFAULT_PREFS: Record<PrefKey, boolean> = { lessons: true, messages: true, reminders: true };

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

type SettingsView = 'menu' | 'data' | 'password';

/** Заголовок блока профиля: название, число и ссылка «Все». */
function BlockHead({ title, to, action }: { title: string; to?: string; action?: React.ReactNode }) {
  return (
    <div className="trk-block-head">
      <h2 className="trk-blocktitle">{title}</h2>
      {action ?? (to && <Link className="trk-block-all" to={to}>Все</Link>)}
    </div>
  );
}

/** Настройки одним окном: фото, данные, пароль, уведомления на почту и выход. Всё остальное в профиле — сводка. */
function SettingsDialog({ open, onClose, onExit }: { open: boolean; onClose: () => void; onExit: () => void }) {
  const { user, setUser } = useSession();
  const toast = useToast();
  const [view, setView] = useState<SettingsView>('menu');
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Moscow');
  const [nameError, setNameError] = useState<string | undefined>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passwordError, setPasswordError] = useState<{ current?: string; next?: string }>({});
  const save = useMutation((input: { name: string; timezone: string }) => api.updateMe(input));
  const photo = useMutation((file: File) => api.uploadMyPhoto(file));
  const password = useMutation((input: { current: string; password: string }) => api.changePassword(input).then(() => true));
  const pref = useMutation((notifications: Record<PrefKey, boolean>) => api.updateMe({ notifications }));
  const prefs = { ...DEFAULT_PREFS, ...user?.notifications };

  const close = () => { setView('menu'); onClose(); };
  const openData = () => { setName(user?.name ?? ''); setTimezone(user?.timezone ?? 'Europe/Moscow'); setNameError(undefined); setView('data'); };
  const openPassword = () => { setCurrent(''); setNext(''); setPasswordError({}); setView('password'); };

  const submitData = async () => {
    if (!name.trim()) { setNameError('Введите имя'); return; }
    setNameError(undefined);
    const updated = await save.run({ name: name.trim(), timezone });
    if (updated) { setUser(updated); toast('Изменения сохранены'); setView('menu'); }
  };
  const changePhoto = async (file: File) => {
    const updated = await photo.run(file);
    if (updated) { setUser(updated); toast('Фото обновлено'); }
  };
  const submitPassword = async () => {
    const found: { current?: string; next?: string } = {};
    if (!current) found.current = 'Введите текущий пароль';
    if (next.length < 8) found.next = 'Новый пароль не короче 8 символов';
    setPasswordError(found);
    if (found.current || found.next) return;
    if (await password.run({ current, password: next })) { setCurrent(''); setNext(''); toast('Пароль изменён'); setView('menu'); }
  };
  const setPref = async (key: PrefKey, value: boolean) => {
    const updated = await pref.run({ ...prefs, [key]: value });
    if (updated) setUser(updated);
  };

  if (view === 'data') {
    return (
      <Modal open={open} onClose={close} title="Личные данные" footer={<><Button variant="line" onClick={() => setView('menu')}>Назад</Button><Button onClick={() => void submitData()} loading={save.pending}>Сохранить</Button></>}>
        <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="name" />
        <TextField label="Почта" value={user?.email ?? ''} readOnly hint="Почту изменить нельзя: она нужна для входа" />
        <SelectField label="Часовой пояс" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={ZONES} hint="В этом поясе показываем время уроков" />
        <FormError error={save.error} />
      </Modal>
    );
  }
  if (view === 'password') {
    return (
      <Modal open={open} onClose={close} title="Смена пароля" footer={<><Button variant="line" onClick={() => setView('menu')}>Назад</Button><Button onClick={() => void submitPassword()} loading={password.pending}>Сменить пароль</Button></>}>
        <PasswordField label="Текущий пароль" value={current} onChange={(e) => setCurrent(e.target.value)} error={passwordError.current} autoComplete="current-password" />
        <PasswordField label="Новый пароль" value={next} onChange={(e) => setNext(e.target.value)} error={passwordError.next} autoComplete="new-password" hint="Не короче 8 символов" />
        <FormError error={password.error} />
      </Modal>
    );
  }
  return (
    <Modal open={open} onClose={close} title="Настройки">
      <div className="trk-settings">
        <FilePick accept="image/*" loading={photo.pending} onPick={(file) => void changePhoto(file)}>{user?.photo ? 'Сменить фото' : 'Загрузить фото'}</FilePick>
        <FormError error={photo.error} />
        <Button variant="line" icon="pen" onClick={openData}>Изменить данные</Button>
        <Button variant="line" icon="lock" onClick={openPassword}>Сменить пароль</Button>
        <div className="trk-settings-prefs">
          <b>Уведомления на почту</b>
          {PREFS.map((p) => <Switch key={p.key} checked={prefs[p.key]} onChange={(v) => void setPref(p.key, v)} title={p.title} text={p.text} />)}
          <FormError error={pref.error} />
        </div>
        <button type="button" className="trk-logout" onClick={onExit}>Выйти</button>
      </div>
    </Modal>
  );
}

/** Профиль: сводка по заявкам, уведомлениям и платежам. Настройки спрятаны за кнопкой с шестерёнкой. */
export function AccountView({ role }: { role: 'student' | 'tutor' }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
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
  const exit = async () => { await logout(); void navigate('/', { replace: true }); };

  return (
    <AppLayout role={role}>
      <PageHeader title="Профиль" actions={<IconButton icon="settings" label="Настройки" onClick={() => setSettings(true)} />} />
      <div className="trk-account">
        <Card pad="sm" className="trk-account-hero">
          <Avatar name={user?.name ?? '•'} photo={user?.photo ?? undefined} size={56} />
          <div className="trk-account-who">
            <h2 className="trk-account-name">{user?.name}</h2>
            <span className="muted">{user?.email}</span>
            <span className="muted sm">{count(done, 'занятие', 'занятия', 'занятий')} · {count(reviews.data?.length ?? 0, 'отзыв', 'отзыва', 'отзывов')}</span>
          </div>
        </Card>

        {role === 'student' && (
          <section className="trk-block trk-block-big" aria-label="Мои заявки">
            <BlockHead title="Мои заявки" action={<IconButton icon="plus" label="Новая заявка" onClick={() => setNewRequest(true)} className="trk-addbtn" />} />
            {requests.loading && !requests.data ? <span className="muted">Загружаем…</span> : activeRequests.length ? (
              <>
                <div className="trk-list">
                  {activeRequests.slice(0, 2).map((r) => <RequestCard key={r.id} compact request={r} actions={<Button size="s" to={`/me/requests/${r.id}`}>Открыть</Button>} />)}
                </div>
                <Button to="/me/requests" variant="line" block>Все заявки</Button>
              </>
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
          <BlockHead title="Уведомления" to={notesTo} />
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
            <BlockHead title="Платежи" to="/me/payments" />
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

      <SettingsDialog open={settings} onClose={() => setSettings(false)} onExit={() => { setSettings(false); setConfirmExit(true); }} />
      <Modal open={newRequest} onClose={() => setNewRequest(false)} title="Новая заявка" width={640}>
        <RequestWizard embedded onDone={() => { setNewRequest(false); requests.reload(); toast('Заявка опубликована'); }} />
      </Modal>
      <ConfirmDialog open={confirmExit} onClose={() => setConfirmExit(false)} onConfirm={() => void exit()} title="Выйти из аккаунта?" text="Чтобы войти снова, понадобятся почта и пароль." confirmLabel="Выйти" />
    </AppLayout>
  );
}

export default function AccountPage() {
  return <AccountView role="student" />;
}
