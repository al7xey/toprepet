import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Card, St, TextField } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { auth, ApiError } from '../../api';
import { YandexButton, takeReturn } from './shared';

export default function Signup({ role }: { role: 'student' | 'tutor' }) {
  const phone = usePhone();
  const navigate = useNavigate();
  const { askLogin, toast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'password', string>>>({});
  const [busy, setBusy] = useState(false);
  const tutor = role === 'tutor';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = auth.validateSignup({ role, name, email, password });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      auth.signup({ role, name, email, password });
      toast('Аккаунт создан', { tone: 'ok' });
      const ret = takeReturn();
      if (tutor) navigate('/tutor/profile/edit?step=1', { replace: true });
      else navigate(ret?.to && ret.to !== '/' ? `/start/for-whom?then=${encodeURIComponent(ret.to)}` : '/start/for-whom', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.data) setErrors(err.data as typeof errors);
      else toast(err instanceof Error ? err.message : 'Не получилось', { tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  const roleTag = (
    <div className="between">
      <St tone="action" icon={tutor ? 'user' : 'search'}>{tutor ? 'Хочу преподавать' : 'Хочу учиться'}</St>
      <Btn size="s" to="/signup">Сменить</Btn>
    </div>
  );
  const form = (
    <form className="r1-form" onSubmit={submit} noValidate>
      <YandexButton label="Продолжить с Яндекс ID" returnTo={tutor ? '/tutor/profile/edit?step=1' : '/start/for-whom'} />
      <div className="r1-or">или по почте</div>
      {tutor
        ? <TextField label="Имя и фамилия" value={name} onChange={setName} autoComplete="name" help="Так вас увидят ученики в анкете" error={errors.name} />
        : <TextField label="Как к вам обращаться" value={name} onChange={setName} autoComplete="given-name" error={errors.name} />}
      <TextField label="Почта, она же логин" type="email" value={email} onChange={setEmail} autoComplete="email" error={errors.email} />
      <TextField label="Пароль" type="password" value={password} onChange={setPassword} placeholder="Не меньше 8 символов" autoComplete="new-password" error={errors.password} />
      <p className="r1-legal">Нажимая «Создать аккаунт», вы принимаете условия сервиса и даёте согласие на обработку персональных данных.</p>
      <Btn v="primary" block type="submit" loading={busy}>Создать аккаунт</Btn>
    </form>
  );
  const wiz = (
    <Card tint style={{ gap: 12 }}>
      <b>Дальше анкета в 4 шага</b>
      <div className="r1-wiz"><div>О себе</div><div>Направления</div><div>Цены</div><div>Расписание</div></div>
      <span className="small" style={{ color: 'var(--ink)' }}>Анкета появится в каталоге сразу после обязательных полей.</span>
    </Card>
  );
  const already = <div className="between" style={{ justifyContent: 'center' }}><span className="small">Уже есть аккаунт?</span><Btn size="s" onClick={() => askLogin()}>Войти</Btn></div>;

  if (phone)
    return (
      <Page title="Регистрация" back="/signup" mTitle="Регистрация">
        {roleTag}
        <h1 className="h2">{tutor ? 'Аккаунт преподавателя' : 'Создайте аккаунт'}</h1>
        {form}
        {tutor ? wiz : already}
      </Page>
    );
  return (
    <Page title="Регистрация">
      {tutor ? (
        <div className="cols c2" style={{ maxWidth: 900, justifySelf: 'center', width: '100%', gap: 24, paddingTop: 16 }}>
          <div className="r1-auth" style={{ maxWidth: 'none' }}>{roleTag}<h1 className="h2">Аккаунт преподавателя</h1>{form}</div>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>{wiz}<Card><b>Уже есть аккаунт?</b><Btn size="s" style={{ justifySelf: 'start' }} onClick={() => askLogin()}>Войти</Btn></Card></div>
        </div>
      ) : (
        <div className="r1-auth" style={{ marginTop: 16 }}>{roleTag}<h1 className="h2">Создайте аккаунт</h1>{form}{already}</div>
      )}
    </Page>
  );
}
