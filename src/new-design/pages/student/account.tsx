import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { useSession } from '../../api/session';
import { AppLayout } from '../../layout/layouts';
import { Button, Card, FormError, Note, PageHeader, SelectField, TextField, useToast } from '../../ui';

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

/** Профиль: имя, часовой пояс, выход. Один экран для ученика и репетитора. */
export function AccountView({ role }: { role: 'student' | 'tutor' }) {
  const { user, setUser, logout } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'Europe/Moscow');
  const [error, setError] = useState<string | undefined>();
  const save = useMutation((input: { name: string; timezone: string }) => api.updateMe(input));

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Введите имя'); return; }
    setError(undefined);
    const updated = await save.run({ name: name.trim(), timezone });
    if (updated) { setUser(updated); toast('Изменения сохранены'); }
  };
  const exit = async () => { await logout(); void navigate('/', { replace: true }); };

  return (
    <AppLayout role={role} narrow>
      <PageHeader title="Профиль" />
      <Card>
        <form className="trk-form" onSubmit={submit} noValidate>
          <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} error={error} autoComplete="name" />
          <TextField label="Почта" value={user?.email ?? ''} readOnly hint="Почту изменить нельзя: она нужна для входа" />
          <SelectField label="Часовой пояс" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={ZONES} hint="В этом поясе показываем время уроков" />
          <FormError error={save.error} />
          <div className="trk-actions"><Button type="submit" loading={save.pending}>Сохранить</Button></div>
        </form>
      </Card>
      {user && !user.emailVerified && <Note tone="bad">Почта не подтверждена. <Button to="/verify-email" variant="line" size="s">Подтвердить</Button></Note>}
      <div className="trk-actions"><Button variant="fill" icon="back" onClick={exit}>Выйти из аккаунта</Button></div>
    </AppLayout>
  );
}

export default function AccountPage() {
  return <AccountView role="student" />;
}
