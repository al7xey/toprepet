import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { Icon } from './icons';
import { nb } from '../lib/text';

/* Toasts, the login prompt and a helper that runs API calls with human error messages. */

export interface Toast {
  id: number;
  text: string;
  tone?: 'ok' | 'bad';
  action?: { label: string; onClick: () => void };
}

export type PendingAction = { type: 'fav'; tutorId: string } | { type: 'go'; to: string };

interface LoginPrompt {
  title: string;
  text?: string;
  after?: PendingAction;
  returnTo: string;
}

interface Ctx {
  toast: (text: string, opts?: Omit<Toast, 'id' | 'text'>) => void;
  login: LoginPrompt | null;
  askLogin: (title?: string, after?: PendingAction, text?: string) => void;
  closeLogin: () => void;
  run: <T>(fn: () => T, okText?: string) => T | undefined;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppProvider is missing');
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [login, setLogin] = useState<LoginPrompt | null>(null);
  const seq = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();

  const toast = useCallback((text: string, opts: Omit<Toast, 'id' | 'text'> = {}) => {
    const id = ++seq.current;
    setToasts(list => [...list.slice(-2), { id, text, ...opts }]);
    window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), opts.action ? 6500 : 4000);
  }, []);

  const askLogin = useCallback((title = 'Войдите, чтобы продолжить', after?: PendingAction, text?: string) => {
    setLogin({ title, after, text, returnTo: location.pathname + location.search });
  }, [location]);

  const run = useCallback(<T,>(fn: () => T, okText?: string) => {
    try {
      const r = fn();
      if (okText) toast(okText, { tone: 'ok' });
      return r;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'auth') {
        askLogin();
        return undefined;
      }
      toast(e instanceof Error ? e.message : 'Что-то пошло не так', { tone: 'bad' });
      if (!(e instanceof ApiError)) console.error(e);
      return undefined;
    }
  }, [toast, askLogin]);

  const value = useMemo<Ctx>(() => ({ toast, login, askLogin, closeLogin: () => setLogin(null), run }), [toast, login, askLogin, run]);
  void navigate;

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast glass ${t.tone === 'bad' ? 'toast--bad' : ''}`} role="status">
            <Icon name={t.tone === 'bad' ? 'warn' : 'check'} />
            <span className="toast-t">{nb(t.text)}</span>
            {t.action && <button className="btn btn--white btn--s" type="button" onClick={t.action.onClick}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
