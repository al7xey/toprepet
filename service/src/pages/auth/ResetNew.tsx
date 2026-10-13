import { useEffect, useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { setNewPassword } from '../../api/auth';
import { useSession } from '../../api/session';
import { authRedirect } from '../../api/supabase';
import { ROLE_HOME } from '../../api/types';
import { Field } from '../../ui/Field';
import { Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/* Page behind the link in the reset letter. supabase-js turns the link into a recovery session;
   a used, expired or broken link arrives with an error (or with no session at all). */
export function ResetNew() {
  usePageMeta('Новый пароль', { noindex: true });
  const { user, profile, loading } = useSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<{ password?: string; repeat?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const fromLink = authRedirect.type === 'recovery' && !authRedirect.error;
  const expired = !loading && (!fromLink || !user);

  useEffect(() => {
    if (saved && profile) void navigate(ROLE_HOME[profile.role], { replace: true });
  }, [saved, profile, navigate]);

  if (loading) return <Loading />;

  if (expired) {
    return (
      <div className="center stack">
        <h1 className="h1">Ссылка устарела</h1>
        <p className="sub">
          Ссылка для нового пароля работает 1&nbsp;час и&nbsp;только один раз. Отправим новую на&nbsp;ваш email.
        </p>
        <Link className="btn p w" to="/reset/">
          Отправить ещё раз
        </Link>
      </div>
    );
  }

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (password.length < 8) errs.password = 'Пароль короче 8 символов.';
    else if (repeat !== password) errs.repeat = 'Пароли не совпадают.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await setNewPassword(password);
    setBusy(false);
    if (res.ok) setSaved(true);
    else if (res.reason === 'weak') setErrors({ password: 'Пароль слишком простой. Добавьте цифры или буквы.' });
    else setErrors({ form: 'Не получилось сохранить пароль. Попробуйте ещё раз или запросите новую ссылку.' });
  }

  return (
    <form className="center stack" onSubmit={submit} noValidate>
      <h1 className="h1">Новый пароль</h1>
      <p className="sub">Для {user?.email}</p>
      <div className="stack">
        <Field
          label="Новый пароль"
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={errors.password}
          hint="Не меньше 8 символов"
        />
        <Field label="Ещё раз" type="password" name="repeat" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} error={errors.repeat} />
      </div>
      {errors.form ? (
        <p className="err" role="alert">
          {errors.form}
        </p>
      ) : null}
      <button type="submit" className="btn p w" disabled={busy}>
        Сохранить и&nbsp;войти
      </button>
    </form>
  );
}
