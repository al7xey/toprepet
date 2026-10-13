import type { ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useSession } from '../api/session';
import { ROLE_HOME, type Role } from '../api/types';
import { LoadError, Loading } from '../ui/LoadError';

/** Only same-site paths are allowed as a return address. */
export function safeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (/^\/(login|signup|reset|admin\/login)\b/.test(next)) return null;
  return next;
}

/** Protected route: guests go to the login page and come back here after it (У2.1-вход); other roles go to their own home. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, profile, loading } = useSession();
  const location = useLocation();
  if (loading) return <div className="ct pg"><Loading /></div>;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    // staff sign in at their own entrance (mockup adminLogin)
    const login = roles.length === 1 && roles[0] === 'admin' ? '/admin/login' : '/login/';
    return <Navigate to={`${login}?next=${encodeURIComponent(next)}`} replace />;
  }
  if (!profile) return <div className="ct pg"><LoadError title="Не получилось загрузить профиль" /></div>;
  if (!roles.includes(profile.role)) return <Navigate to={ROLE_HOME[profile.role]} replace />;
  return children;
}

/** Login and sign-up: a signed-in visitor (or one who just signed in) goes on to `?next=` or their home. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useSession();
  const [params] = useSearchParams();
  if (loading) return <Loading />;
  if (user && profile) return <Navigate to={safeNext(params.get('next')) ?? ROLE_HOME[profile.role]} replace />;
  return children;
}
