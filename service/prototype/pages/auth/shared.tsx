import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, students, ApiError } from '../../api';
import type { User } from '../../api/types';
import { Btn, TextField } from '../../ui/kit';
import { useApp, type PendingAction } from '../../ui/app-state';

const RETURN_KEY = 'toprepet.service.return';

export function rememberReturn(to: string, after?: PendingAction) {
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ to, after }));
  } catch {
    /* ignore */
  }
}

export function takeReturn(): { to: string; after?: PendingAction } | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* where a person lands after signing in */
export function homeFor(u: User, returnTo?: string) {
  if (u.role === 'admin') return returnTo?.startsWith('/admin') ? returnTo : '/admin/disputes';
  if (u.role === 'tutor') return returnTo && /^\/(tutor|messages|help|support|notifications|account\/settings|requests)/.test(returnTo) ? (returnTo === '/requests' ? '/tutor/requests' : returnTo) : '/tutor/lessons';
  if (!returnTo || returnTo === '/login' || returnTo.startsWith('/signup') || returnTo.startsWith('/password')) return u.onboarding && !u.onboarding.done ? '/start/for-whom' : '/my/lessons';
  return returnTo;
}

export function useAfterLogin() {
  const navigate = useNavigate();
  const { toast } = useApp();
  return (u: User, returnTo?: string, after?: PendingAction) => {
    if (after?.type === 'fav' && u.role === 'student') {
      try {
        students.toggleFavorite(after.tutorId, true);
        toast('Репетитор сохранён в избранном', { tone: 'ok' });
      } catch {
        /* ignore */
      }
    }
    const to = after?.type === 'go' ? after.to : homeFor(u, returnTo);
    navigate(to, { replace: true });
  };
}

export function YandexButton({ label = 'Войти с Яндекс ID', returnTo, after }: { label?: string; returnTo?: string; after?: PendingAction }) {
  const navigate = useNavigate();
  return (
    <button className="btn btn--block r1-ya" type="button" onClick={() => { rememberReturn(returnTo ?? '/', after); navigate('/auth/yandex'); }}>
      <span className="r1-ya-i" aria-hidden="true">Я</span>{label}
    </button>
  );
}

export function LoginForm({ returnTo, after, onDone }: { returnTo: string; after?: PendingAction; onDone?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const afterLogin = useAfterLogin();
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth.isEmail(email)) return setError('Проверьте почту: например, name@mail.ru');
    if (!password) return setError('Введите пароль');
    setBusy(true);
    try {
      const u = auth.login(email, password);
      onDone?.();
      afterLogin(u, returnTo, after);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не получилось войти');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="r1-form" onSubmit={submit} noValidate>
      <YandexButton returnTo={returnTo} after={after} />
      <div className="r1-or">или по почте</div>
      <TextField label="Почта" type="email" value={email} onChange={setEmail} autoComplete="email" error={error && !password ? undefined : undefined} />
      <TextField label="Пароль" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p className="err" role="alert" style={{ paddingLeft: 4 }}>{error}</p>}
      <Btn v="primary" block type="submit" loading={busy}>Войти</Btn>
      <div className="r1-two">
        <Btn size="s" onClick={() => { onDone?.(); navigate('/password/reset'); }}>Забыли пароль?</Btn>
        <Btn size="s" onClick={() => { onDone?.(); rememberReturn(returnTo, after); navigate('/signup'); }}>Регистрация</Btn>
      </div>
    </form>
  );
}
