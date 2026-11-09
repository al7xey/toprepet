import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { SessionProvider } from './api/session';
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
import { LiquidGlassEffects } from './ui/liquid-glass';
import './ui/liquid-motion.css';

const NotFoundPage = lazy(() => import('./pages/public/notfound'));

/** Новая страница всегда открывается с самого верха, а не с места, где остановилась предыдущая. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function NewApp() {
  return (
    <SessionProvider>
      <div className="tr">
        <LiquidGlassEffects />
        <ToastProvider>
          <ScrollToTop />
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
