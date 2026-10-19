import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { AppLayout } from '../../layout/layouts';
import { Avatar, Button, Card, CardTitle, ConfirmDialog, FilePick, FormError, Icon, Modal, Note, PageHeader, PasswordField, SelectField, Switch, TextField, useToast } from '../../ui';

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

/** Разделы кабинета, которых нет в нижнем меню: открываются из профиля. */
const SECTIONS: Record<'student' | 'tutor', { label: string; to: string; icon: string }[]> = {
  student: [
    { label: 'Мои уроки', to: '/me/lessons', icon: 'cal' },
    { label: 'Мои заявки', to: '/me/requests', icon: 'circle-check' },
    { label: 'Платежи', to: '/me/payments', icon: 'card' },
    { label: 'Уведомления', to: '/me/notifications', icon: 'bell' },
  ],
  tutor: [
    { label: 'Анкета', to: '/tutor/profile', icon: 'school' },
    { label: 'Расписание', to: '/tutor/schedule', icon: 'clock' },
    { label: 'Доход и выплаты', to: '/tutor/finance', icon: 'wallet' },
    { label: 'Ученики', to: '/tutor/students', icon: 'person-plus' },
    { label: 'Отзывы', to: '/tutor/reviews', icon: 'star' },
    { label: 'Уведомления', to: '/tutor/notifications', icon: 'bell' },
  ],
};

type Dialog = 'data' | 'password' | 'exit' | null;

/** Профиль: фото и статистика, разделы кабинета, настройки. Изменение данных и пароля открывается кнопкой. */
export function AccountView({ role }: { role: 'student' | 'tutor' }) {
  const { user, setUser, logout } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Moscow');
  const [nameError, setNameError] = useState<string | undefined>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passwordError, setPasswordError] = useState<{ current?: string; next?: string }>({});
  const past = useQuery(`account-lessons-${role}`, () => api.listLessons('past'));
  const reviews = useQuery(`account-reviews-${role}`, () => api.listMyReviews());
  const save = useMutation((input: { name: string; timezone: string }) => api.updateMe(input));
  const photo = useMutation((file: File) => api.uploadMyPhoto(file));
  const password = useMutation((input: { current: string; password: string }) => api.changePassword(input).then(() => true));
  const pref = useMutation((notifications: Record<PrefKey, boolean>) => api.updateMe({ notifications }));
  const prefs = { ...DEFAULT_PREFS, ...user?.notifications };
  const done = past.data?.filter((l) => l.status === 'completed').length ?? 0;
  const close = () => setDialog(null);

  const openData = () => { setName(user?.name ?? ''); setTimezone(user?.timezone ?? 'Europe/Moscow'); setNameError(undefined); setDialog('data'); };
  const openPassword = () => { setCurrent(''); setNext(''); setPasswordError({}); setDialog('password'); };

  const submitData = async () => {
    if (!name.trim()) { setNameError('Введите имя'); return; }
    setNameError(undefined);
    const updated = await save.run({ name: name.trim(), timezone });
    if (updated) { setUser(updated); toast('Изменения сохранены'); close(); }
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
    if (await password.run({ current, password: next })) { setCurrent(''); setNext(''); toast('Пароль изменён'); close(); }
  };
  const setPref = async (key: PrefKey, value: boolean) => {
    const updated = await pref.run({ ...prefs, [key]: value });
    if (updated) setUser(updated);
  };
  const exit = async () => { await logout(); void navigate('/', { replace: true }); };

  return (
    <AppLayout role={role}>
      <PageHeader title="Профиль" />
      <div className="trk-account">
        <Card pad="sm" className="trk-account-hero">
          <Avatar name={user?.name ?? '•'} photo={user?.photo ?? undefined} size={72} />
          <div className="trk-account-who">
            <h2 className="trk-account-name">{user?.name}</h2>
            <span className="muted">{user?.email}</span>
            <span className="muted sm">Занятий проведено: <b className="tn">{done}</b> · Отзывов: <b className="tn">{reviews.data?.length ?? 0}</b></span>
          </div>
          <FilePick accept="image/*" loading={photo.pending} onPick={(file) => void changePhoto(file)}>{user?.photo ? 'Сменить фото' : 'Загрузить фото'}</FilePick>
          <FormError error={photo.error} />
        </Card>

        <nav className="trk-navlist" aria-label="Разделы кабинета">
          {SECTIONS[role].map((s) => (
            <Link key={s.to} className="trk-navrow" to={s.to}><Icon name={s.icon} /><span>{s.label}</span><Icon name="right" /></Link>
          ))}
        </nav>

        <Card pad="sm">
          <div className="trk-form">
            <CardTitle>Настройки</CardTitle>
            <div className="trk-actions">
              <Button variant="fill" icon="pen" onClick={openData}>Изменить данные</Button>
              <Button variant="fill" icon="lock" onClick={openPassword}>Сменить пароль</Button>
            </div>
          </div>
        </Card>

        <Card pad="sm">
          <div className="trk-form">
            <CardTitle>Уведомления на почту</CardTitle>
            {PREFS.map((p) => <Switch key={p.key} checked={prefs[p.key]} onChange={(v) => void setPref(p.key, v)} title={p.title} text={p.text} />)}
            <FormError error={pref.error} />
          </div>
        </Card>

        {user && !user.emailVerified && (
          <Note tone="bad">Почта не подтверждена. <Button to="/verify-email" variant="fill" size="s">Подтвердить</Button></Note>
        )}
      </div>
      <button type="button" className="trk-logout" onClick={() => setDialog('exit')}>Выйти</button>

      <Modal open={dialog === 'data'} onClose={close} title="Личные данные" footer={<><Button variant="fill" onClick={close}>Отмена</Button><Button onClick={() => void submitData()} loading={save.pending}>Сохранить</Button></>}>
        <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="name" />
        <TextField label="Почта" value={user?.email ?? ''} readOnly hint="Почту изменить нельзя: она нужна для входа" />
        <SelectField label="Часовой пояс" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={ZONES} hint="В этом поясе показываем время уроков" />
        <FormError error={save.error} />
      </Modal>

      <Modal open={dialog === 'password'} onClose={close} title="Смена пароля" footer={<><Button variant="fill" onClick={close}>Отмена</Button><Button onClick={() => void submitPassword()} loading={password.pending}>Сменить пароль</Button></>}>
        <PasswordField label="Текущий пароль" value={current} onChange={(e) => setCurrent(e.target.value)} error={passwordError.current} autoComplete="current-password" />
        <PasswordField label="Новый пароль" value={next} onChange={(e) => setNext(e.target.value)} error={passwordError.next} autoComplete="new-password" hint="Не короче 8 символов" />
        <FormError error={password.error} />
      </Modal>

      <ConfirmDialog open={dialog === 'exit'} onClose={close} onConfirm={() => void exit()} title="Выйти из аккаунта?" text="Чтобы войти снова, понадобятся почта и пароль." confirmLabel="Выйти" />
    </AppLayout>
  );
}

export default function AccountPage() {
  return <AccountView role="student" />;
}
