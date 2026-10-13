import { useState, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../api/auth';
import { Field } from '../../ui/Field';
import { usePageMeta } from '../../ui/meta';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Reset() {
  usePageMeta('Восстановление пароля', { noindex: true });
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Проверьте email: в нём должны быть @ и домен.');
      return;
    }
    setError(null);
    setBusy(true);
    await requestPasswordReset(email);
    setBusy(false);
    setSentTo(email.trim());
  }

  if (sentTo) {
    // The same answer for any address (У3.2): the form must not reveal who has an account.
    return (
      <div className="center stack">
        <span className="ico" aria-hidden="true" />
        <h1 className="h1">Проверьте почту</h1>
        <output data-testid="reset-answer">
          Если {sentTo} зарегистрирован в&nbsp;TopRepet, на&nbsp;него придёт письмо со&nbsp;ссылкой. Ссылка работает 1&nbsp;час и&nbsp;только один раз.
        </output>
        <p className="mut sm">Письма нет? Проверьте папку «Спам» или отправьте ещё раз через 60&nbsp;секунд.</p>
        <Link className="btn w" to="/login/">
          Ко входу
        </Link>
      </div>
    );
  }

  return (
    <form className="center stack" onSubmit={submit} noValidate>
      <Link className="back" to="/login/">
        Ко входу
      </Link>
      <h1 className="h1">Восстановление пароля</h1>
      <p className="sub">Пришлём ссылку для нового пароля.</p>
      <Field label="Email" type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} error={error} />
      <button type="submit" className="btn p w" disabled={busy}>
        Отправить ссылку
      </button>
    </form>
  );
}
