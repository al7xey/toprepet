import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { AuthLayout } from '../../layout/layouts';
import { Button, EmptyState, FormError, PageHeader, TextField } from '../../ui';
import { AuthCard, emailValid } from './shared';

/** Сброс пароля: письмо со ссылкой. Не раскрываем, есть ли такая почта в сервисе. */
export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const reset = useMutation(async (value: string) => { await api.requestPasswordReset(value); return true; });

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!emailValid(email)) { setError('Введите почту, например name@mail.ru'); return; }
    setError(undefined);
    if (await reset.run(email.trim())) setSent(true);
  };

  return (
    <AuthLayout>
      <PageHeader title="Сброс пароля" lead="Укажите почту, и мы пришлём ссылку для нового пароля." center />
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
