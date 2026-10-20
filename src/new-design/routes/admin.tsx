import { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const DisputesPage = lazy(() => import('../pages/admin/disputes'));
const CancellationsPage = lazy(() => import('../pages/admin/cancellations'));
const ReviewsPage = lazy(() => import('../pages/admin/reviews'));
const ProfilesPage = lazy(() => import('../pages/admin/profiles'));

const admin = (page: React.ReactNode) => <RequireRole role="admin">{page}</RequireRole>;

/** Админка поддержки: споры, отмены, отзывы и анкеты на проверке. */
export const adminRoutes = (
  <>
    <Route path="/admin" element={<Navigate to="/admin/disputes" replace />} />
    <Route path="/admin/disputes" element={admin(<DisputesPage />)} />
    <Route path="/admin/cancellations" element={admin(<CancellationsPage />)} />
    <Route path="/admin/reviews" element={admin(<ReviewsPage />)} />
    <Route path="/admin/profiles" element={admin(<ProfilesPage />)} />
  </>
);
