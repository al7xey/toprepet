import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { signIn } from '../../api/auth';
import { Field } from '../../ui/Field';

/** Shared by /login/ and, from iteration 3, the login dialog on «Записаться». After success the session redirects (GuestOnly). */
export function LoginForm({ next, emailLabel = 'Email', staff = false }: { next?: string | null; emailLabel?: string; staff?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Введите email и пароль.');
      return;
    }
    setBusy(true);
    const res = await signIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(
        res.reason === 'network'
          ? 'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.'
          : res.reason === 'blocked'
            ? 'Аккаунт заблокирован. Если это ошибка, напишите в поддержку: Telegram @toprepet_manager.'
            : 'Email или пароль не подходят. Проверьте раскладку или восстановите пароль.',
      );
    }
  }

  const signupHref = next ? `/signup/?next=${encodeURIComponent(next)}` : '/signup/';
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label={emailLabel} type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
      <Field
        label="Пароль"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={error}
      />
      <button type="submit" className="btn p w" disabled={busy}>
        Войти
      </button>
      <div className="row sb">
        <Link className="lnk tap" to="/reset/">
          Забыли пароль?
        </Link>
        {staff ? null : (
          <Link className="lnk tap" to={signupHref}>
            Зарегистрироваться
          </Link>
        )}
      </div>
    </form>
  );
}
