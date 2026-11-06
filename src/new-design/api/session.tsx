import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from './index';
import { ApiError } from './contract';
import { ErrorState, LoadingList, PageHeader } from '../ui/kit';
import type { Role, User } from './types';

interface Session {
  user: User | null;
  /** true, пока не выяснили, вошёл ли пользователь. */
  checking: boolean;
  error: string | null;
  retry: () => void;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session>({ user: null, checking: true, error: null, retry: () => {}, setUser: () => {}, logout: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const epoch = useRef(0);
  const acceptUser = useCallback((next: User | null) => {
    epoch.current += 1;
    setUser(next); setError(null); setChecking(false);
  }, []);
  const retry = useCallback(() => {
    epoch.current += 1;
    setChecking(true); setError(null); setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    let alive = true;
    const current = ++epoch.current;
    const active = () => alive && current === epoch.current;
    api.me().then((u) => { if (active()) setUser(u); }).catch((reason) => {
      if (active()) setError(reason instanceof ApiError ? reason.message : 'Не удалось проверить вход. Проверьте соединение и повторите попытку.');
    }).finally(() => { if (active()) setChecking(false); });
    return () => { alive = false; };
  }, [attempt]);
  const logout = useCallback(async () => { await api.logout(); startTransition(() => { navigate('/', { replace: true }); acceptUser(null); }); }, [acceptUser, navigate]);
  const value = useMemo(() => ({ user, checking, error, retry, setUser: acceptUser, logout }), [user, checking, error, retry, acceptUser, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Домашний раздел кабинета для роли. */
export const homeFor = (role: Role) => (role === 'tutor' ? '/tutor/lessons' : role === 'admin' ? '/admin/disputes' : '/me/lessons');

/** Пускает только вошедших с нужной ролью; остальных отправляет на вход и возвращает обратно после него. */
export function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { user, checking, error, retry } = useSession();
  const location = useLocation();
  if (checking || error) return <main id="main" tabIndex={-1} className="trh-main trk-session-state"><PageHeader title={checking ? 'Проверяем вход…' : 'Вход в кабинет'} />{checking ? <LoadingList rows={2} /> : <ErrorState text={error!} onRetry={retry} />}</main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
