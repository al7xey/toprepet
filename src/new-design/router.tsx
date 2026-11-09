import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api';
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
import { LiquidGlassEffects } from './ui/liquid-glass';
import { LiquidMotion } from './ui/liquid-motion';

const NotFoundPage = lazy(() => import('./pages/public/notfound'));

/** Новая страница всегда открывается с самого верха, а не с места, где остановилась предыдущая. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export function NewApp() {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <SessionProvider>
      <div className="tr" ref={root}>
        <LiquidGlassEffects />
        <LiquidMotion />
        <ToastProvider>
          {api.mode === 'mock' && <aside className="demo-notice" aria-label="Демонстрационный режим">Демонстрационная версия. Записи и оплаты не отправляются. Не вводите настоящие данные карты.</aside>}
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
