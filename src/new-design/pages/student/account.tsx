import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { AppLayout } from '../../layout/layouts';
import { Avatar, Button, Card, CardTitle, ConfirmDialog, FilePick, FormError, Note, PageHeader, PasswordField, SelectField, Switch, TextField, useToast } from '../../ui';

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

/** Профиль: фото, статистика, личные данные, пароль, уведомления и выход. Один экран для ученика и репетитора. */
export function AccountView({ role }: { role: 'student' | 'tutor' }) {
  const { user, setUser, logout } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Moscow');
  const [nameError, setNameError] = useState<string | undefined>();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passwordError, setPasswordError] = useState<{ current?: string; next?: string }>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const past = useQuery(`account-lessons-${role}`, () => api.listLessons('past'));
  const reviews = useQuery(`account-reviews-${role}`, () => api.listMyReviews());
  const save = useMutation((input: { name: string; timezone: string }) => api.updateMe(input));
  const photo = useMutation((file: File) => api.uploadMyPhoto(file));
  const password = useMutation((input: { current: string; password: string }) => api.changePassword(input).then(() => true));
  const pref = useMutation((notifications: Record<PrefKey, boolean>) => api.updateMe({ notifications }));
  const prefs = { ...DEFAULT_PREFS, ...user?.notifications };
  const done = past.data?.filter((l) => l.status === 'completed').length ?? 0;

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('Введите имя'); return; }
    setNameError(undefined);
    const updated = await save.run({ name: name.trim(), timezone });
    if (updated) { setUser(updated); toast('Изменения сохранены'); }
  };
  const changePhoto = async (file: File) => {
    const updated = await photo.run(file);
    if (updated) { setUser(updated); toast('Фото обновлено'); }
  };
  const changePassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    const found: { current?: string; next?: string } = {};
    if (!current) found.current = 'Введите текущий пароль';
    if (next.length < 8) found.next = 'Новый пароль не короче 8 символов';
    setPasswordError(found);
    if (found.current || found.next) return;
    if (await password.run({ current, password: next })) { setCurrent(''); setNext(''); toast('Пароль изменён'); }
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
        <div className="trk-account-wide">
          <Card>
            <div className="trk-account-hero">
              <Avatar name={user?.name ?? '•'} photo={user?.photo ?? undefined} size={112} />
              <div className="trk-account-who">
                <h2 className="trk-account-name">{user?.name}</h2>
                <span className="muted">{user?.email}</span>
                <FilePick accept="image/*" loading={photo.pending} onPick={(file) => void changePhoto(file)}>{user?.photo ? 'Сменить фото' : 'Загрузить фото'}</FilePick>
                <FormError error={photo.error} />
              </div>
              <dl className="trk-account-stats">
                <div><dt>Занятий проведено</dt><dd className="tn">{done}</dd></div>
                <div><dt>Отзывов</dt><dd className="tn">{reviews.data?.length ?? 0}</dd></div>
              </dl>
            </div>
          </Card>
        </div>

        <Card>
          <form className="trk-form" onSubmit={submit} noValidate>
            <CardTitle>Личные данные</CardTitle>
            <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="name" />
            <TextField label="Почта" value={user?.email ?? ''} readOnly hint="Почту изменить нельзя: она нужна для входа" />
            <SelectField label="Часовой пояс" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={ZONES} hint="В этом поясе показываем время уроков" />
            <FormError error={save.error} />
            <Button type="submit" size="lg" block loading={save.pending}>Сохранить</Button>
          </form>
        </Card>

        <Card>
          <form className="trk-form" onSubmit={changePassword} noValidate>
            <CardTitle>Безопасность</CardTitle>
            <PasswordField label="Текущий пароль" value={current} onChange={(e) => setCurrent(e.target.value)} error={passwordError.current} autoComplete="current-password" />
            <PasswordField label="Новый пароль" value={next} onChange={(e) => setNext(e.target.value)} error={passwordError.next} autoComplete="new-password" hint="Не короче 8 символов" />
            <FormError error={password.error} />
            <Button type="submit" size="lg" block variant="line" loading={password.pending}>Сменить пароль</Button>
          </form>
        </Card>

        <Card>
          <div className="trk-form">
            <CardTitle>Уведомления на почту</CardTitle>
            {PREFS.map((p) => <Switch key={p.key} checked={prefs[p.key]} onChange={(v) => void setPref(p.key, v)} title={p.title} text={p.text} />)}
            <FormError error={pref.error} />
          </div>
        </Card>

        {user && !user.emailVerified && (
          <Note tone="bad">Почта не подтверждена. <Button to="/verify-email" variant="line" size="s">Подтвердить</Button></Note>
        )}
      </div>
      <button type="button" className="trk-logout" onClick={() => setConfirmExit(true)}>Выйти</button>
      <ConfirmDialog open={confirmExit} onClose={() => setConfirmExit(false)} onConfirm={() => void exit()} title="Выйти из аккаунта?" text="Чтобы войти снова, понадобятся почта и пароль." confirmLabel="Выйти" />
    </AppLayout>
  );
}

export default function AccountPage() {
  return <AccountView role="student" />;
}
