import { lazy, Suspense, useRef } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SessionProvider } from './api/session';
import { useReveal } from './reveal';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { requestRoutes } from './routes/requests';
import { studentRoutes } from './routes/student';
import { tutorRoutes } from './routes/tutor';
import { tutorProfileRoutes } from './routes/tutorprofile';
import { ToastProvider } from './ui';
import './tr.css';
import './home.css';
import './ui/kit.css';

const NotFoundPage = lazy(() => import('./pages/public/notfound'));

/** Адреса, которые обслуживает новый интерфейс. Остальные (блог, документы, старые лендинги) — прежнее приложение. */
const PREFIXES = ['/teachers', '/for-repetitor', '/login', '/signup', '/auth', '/reset-password', '/verify-email', '/onboarding', '/me', '/tutor', '/admin', '/book', '/requests', '/help'];

export function isNewPath(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' || PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function NewApp() {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <SessionProvider>
      <div className="tr" ref={root}>
        <div className="trh-progress" aria-hidden="true" />
        <ToastProvider>
          <Suspense fallback={<div className="trk-route-loading" aria-busy="true" />}>
            <Routes>
              {publicRoutes}
              {authRoutes}
              {studentRoutes}
              {requestRoutes}
              {tutorRoutes}
              {tutorProfileRoutes}
              {adminRoutes}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </div>
    </SessionProvider>
  );
}
