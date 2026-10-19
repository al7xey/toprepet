import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { useSession } from '../../api/session';
import { AppLayout } from '../../layout/layouts';
import { Avatar, Button, Card, ConfirmDialog, FilePick, FormError, Icon, PageHeader, PasswordField, SelectField, Switch, TextField, useToast } from '../../ui';

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

type View = 'menu' | 'data' | 'password';

/** Настройки: отдельная страница. Фото, личные данные, пароль, уведомления на почту и выход. */
export function SettingsView({ role }: { role: 'student' | 'tutor' }) {
  const { user, setUser, logout } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<View>('menu');
  const [confirmExit, setConfirmExit] = useState(false);
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
  const profileTo = role === 'tutor' ? '/tutor/account' : '/me/account';

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
  const exit = async () => { await logout(); void navigate('/', { replace: true }); };

  if (view === 'data') {
    return (
      <AppLayout role={role} narrow>
        <PageHeader title="Личные данные" back={{ onClick: () => setView('menu'), label: 'Назад к настройкам' }} />
        <Card>
          <div className="trk-form">
            <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="name" />
            <TextField label="Почта" value={user?.email ?? ''} readOnly hint="Почту изменить нельзя: она нужна для входа" />
            <SelectField label="Часовой пояс" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={ZONES} hint="В этом поясе показываем время уроков" />
            <FormError error={save.error} />
            <Button size="lg" block onClick={() => void submitData()} loading={save.pending}>Сохранить</Button>
          </div>
        </Card>
      </AppLayout>
    );
  }
  if (view === 'password') {
    return (
      <AppLayout role={role} narrow>
        <PageHeader title="Смена пароля" back={{ onClick: () => setView('menu'), label: 'Назад к настройкам' }} />
        <Card>
          <div className="trk-form">
            <PasswordField label="Текущий пароль" value={current} onChange={(e) => setCurrent(e.target.value)} error={passwordError.current} autoComplete="current-password" />
            <PasswordField label="Новый пароль" value={next} onChange={(e) => setNext(e.target.value)} error={passwordError.next} autoComplete="new-password" hint="Не короче 8 символов" />
            <FormError error={password.error} />
            <Button size="lg" block onClick={() => void submitPassword()} loading={password.pending}>Сменить пароль</Button>
          </div>
        </Card>
      </AppLayout>
    );
  }
  return (
    <AppLayout role={role} narrow>
      <PageHeader title="Настройки" back={{ to: profileTo, label: 'Профиль' }} />
      <Card>
        <div className="trk-settings-who">
          <Avatar name={user?.name ?? '•'} photo={user?.photo ?? undefined} size={64} />
          <div className="trk-account-who"><h2 className="trk-account-name">{user?.name}</h2><span className="muted">{user?.email}</span></div>
        </div>
        <FilePick accept="image/*" loading={photo.pending} onPick={(file) => void changePhoto(file)}>{user?.photo ? 'Сменить фото' : 'Загрузить фото'}</FilePick>
        <FormError error={photo.error} />
      </Card>
      <div className="trk-navlist">
        <button type="button" className="trk-navrow" onClick={openData}><Icon name="pen" /><span>Личные данные</span><Icon name="right" /></button>
        <button type="button" className="trk-navrow" onClick={openPassword}><Icon name="lock" /><span>Сменить пароль</span><Icon name="right" /></button>
      </div>
      <Card>
        <div className="trk-form">
          <h2 className="trk-cardtitle">Уведомления на почту</h2>
          {PREFS.map((p) => <Switch key={p.key} checked={prefs[p.key]} onChange={(v) => void setPref(p.key, v)} title={p.title} text={p.text} />)}
          <FormError error={pref.error} />
        </div>
      </Card>
      <button type="button" className="trk-logout" onClick={() => setConfirmExit(true)}>Выйти</button>
      <ConfirmDialog open={confirmExit} onClose={() => setConfirmExit(false)} onConfirm={() => void exit()} title="Выйти из аккаунта?" text="Чтобы войти снова, понадобятся почта и пароль." confirmLabel="Выйти" />
    </AppLayout>
  );
}

export default function SettingsPage() {
  return <SettingsView role="student" />;
}
