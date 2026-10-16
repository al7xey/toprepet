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
/** Адреса, которые пока живут в старом приложении (переносятся на этапе 7). Всё остальное, включая 404, — новый интерфейс. */
const LEGACY = ['/legal', '/lessons', '/contact', '/free-intro', '/for-tutors', '/teacher', '/direction'];

export function isNewPath(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return !LEGACY.some((p) => path === p || path.startsWith(`${p}/`));
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
