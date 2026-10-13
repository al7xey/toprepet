import { useState, type SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { signUp } from '../../api/auth';
import { safeNext } from '../../app/Guard';
import { guessZone } from '../../lib/time';
import { Field } from '../../ui/Field';
import { usePageMeta } from '../../ui/meta';
import { reachGoal } from '../../app/metrika';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'form', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Signup() {
  usePageMeta('Регистрация', { noindex: true });
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [role, setRole] = useState<'student' | 'tutor'>(params.get('role') === 'tutor' ? 'tutor' : 'student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Errors = {};
    if (!name.trim()) errs.name = 'Напишите, как к вам обращаться.';
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Проверьте email: в нём должны быть @ и домен.';
    if (password.length < 8) errs.password = 'Пароль короче 8 символов.';
    setErrors(errs);
    setTaken(false);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await signUp({ name, email, password, role, tz: guessZone() });
    setBusy(false);
    if (res.ok) {
      reachGoal('signup', { role });
      return;
    } // GuestOnly sends the new user on to ?next= or their home
    if (res.reason === 'taken') setTaken(true);
    else if (res.reason === 'weak') setErrors({ password: 'Пароль слишком простой. Добавьте цифры или буквы.' });
    else if (res.reason === 'rate') setErrors({ form: 'Слишком много попыток. Подождите минуту и попробуйте ещё раз.' });
    else setErrors({ form: 'Не получилось создать аккаунт. Проверьте интернет и попробуйте ещё раз.' });
  }

  const loginHref = next ? `/login/?next=${encodeURIComponent(next)}` : '/login/';
  return (
    <form className="center stack" onSubmit={submit} noValidate>
      <h1 className="h1">Регистрация</h1>
      <fieldset className="stack s">
        <legend className="h3">Кто вы на&nbsp;TopRepet?</legend>
        <div className="opts col">
          <label className="opt">
            <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />Я учусь
          </label>
          <label className="opt">
            <input type="radio" name="role" value="tutor" checked={role === 'tutor'} onChange={() => setRole('tutor')} />Я преподаю
          </label>
        </div>
        <span className="hint">
          Роль потом не&nbsp;меняется. Чтобы и&nbsp;учиться, и&nbsp;преподавать, понадобятся два аккаунта с&nbsp;разными email.
        </span>
      </fieldset>
      <Field label="Имя" name="name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} error={errors.name} maxLength={80} />
      <div className="fld">
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={errors.email ?? (taken ? 'С этим email уже есть аккаунт. Войдите или зарегистрируйтесь с другим email.' : null)}
        />
        {taken ? (
          <Link className="lnk tap" to={loginHref} style={{ justifySelf: 'start' }}>
            Войти с&nbsp;этим email
          </Link>
        ) : null}
      </div>
      <Field
        label="Пароль"
        type="password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        error={errors.password}
        hint="Не меньше 8 символов"
      />
      <p className="mut sm">
        Нажимая «Создать аккаунт», вы принимаете условия сервиса и&nbsp;соглашаетесь на&nbsp;обработку персональных данных.
      </p>
      {errors.form ? (
        <p className="err" role="alert">
          {errors.form}
        </p>
      ) : null}
      <button type="submit" className="btn p w" disabled={busy}>
        Создать аккаунт
      </button>
      <p className="mut sm">
        Уже есть аккаунт?{' '}
        <Link className="lnk" to={loginHref}>
          Войти
        </Link>
      </p>
    </form>
  );
}
