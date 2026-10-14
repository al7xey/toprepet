import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './index';
import type { Role, User } from './types';

interface Session {
  user: User | null;
  /** true, пока не выяснили, вошёл ли пользователь. */
  checking: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session>({ user: null, checking: true, setUser: () => {}, logout: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let alive = true;
    api.me().then((u) => { if (alive) setUser(u); }).catch(() => {}).finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);
  const logout = useCallback(async () => { await api.logout(); setUser(null); }, []);
  const value = useMemo(() => ({ user, checking, setUser, logout }), [user, checking, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

/** Домашний раздел кабинета для роли. */
export const homeFor = (role: Role) => (role === 'tutor' ? '/tutor/lessons' : role === 'admin' ? '/admin/disputes' : '/me/lessons');

/** Пускает только вошедших с нужной ролью; остальных отправляет на вход и возвращает обратно после него. */
export function RequireRole({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { user, checking } = useSession();
  const location = useLocation();
  if (checking) return null;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
