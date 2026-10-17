import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { trackGoal } from '../../../shared/lib/analytics';
import { useMutation } from '../../api/hooks';
import { AuthLayout } from '../../layout/layouts';
import { Button, EmptyState, FormError, PageHeader, PasswordField, TextField, useToast } from '../../ui';
import { AuthCard, emailValid } from './shared';

/** Сброс пароля: письмо со ссылкой, по ссылке (?token=) — форма нового пароля. Не раскрываем, есть ли такая почта в сервисе. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return token ? <NewPasswordPage token={token} /> : <RequestPage />;
}

function NewPasswordPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const confirm = useMutation(async (value: string) => { await api.confirmPasswordReset(token, value); return true; });
  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Пароль должен быть не короче 8 символов'); return; }
    setError(undefined);
    if (await confirm.run(password)) { toast('Пароль изменён. Войдите с новым паролем'); void navigate('/login', { replace: true }); }
  };
  return (
    <AuthLayout>
      <PageHeader title="Новый пароль" center />
      <AuthCard>
        <form className="trk-form" onSubmit={submit} noValidate>
          <PasswordField label="Новый пароль" name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Не короче 8 символов" error={error} />
          <FormError error={confirm.error} />
          <Button type="submit" size="lg" block loading={confirm.pending}>Сохранить пароль</Button>
          <p className="muted trk-auth-foot"><Link className="acc" to="/reset-password">Запросить новую ссылку</Link></p>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}

function RequestPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const reset = useMutation(async (value: string) => { await api.requestPasswordReset(value); return true; });

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!emailValid(email)) { setError('Введите почту, например name@mail.ru'); return; }
    setError(undefined);
    if (await reset.run(email.trim())) { trackGoal('reset_request'); setSent(true); }
  };

  return (
    <AuthLayout>
      <PageHeader title="Сброс пароля" center />
      <AuthCard>
        {sent ? (
          <EmptyState icon="send" title="Письмо отправлено" text={<>Если аккаунт с адресом <b>{email.trim()}</b> есть, в письме будет ссылка для нового пароля. Проверьте и папку «Спам».</>}
            actions={<Button to="/login" variant="line">Вернуться ко входу</Button>} />
        ) : (
          <form className="trk-form" onSubmit={submit} noValidate>
            <TextField label="Почта" type="email" name="email" autoComplete="email" inputMode="email" placeholder="name@mail.ru" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <FormError error={reset.error} />
            <Button type="submit" size="lg" block loading={reset.pending}>Отправить ссылку</Button>
            <p className="muted trk-auth-foot"><Link className="acc" to="/login">Вернуться ко входу</Link></p>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
