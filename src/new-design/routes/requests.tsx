import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const FeedPage = lazy(() => import('../pages/requests/feed'));
const NewRequestPage = lazy(() => import('../pages/requests/new'));
const MyRequestsPage = lazy(() => import('../pages/requests/mine'));
const RequestDetailPage = lazy(() => import('../pages/requests/detail'));

const student = (page: React.ReactNode) => <RequireRole role="student">{page}</RequireRole>;

/** Заявки: общая лента, создание и отклики для ученика. */
export const requestRoutes = (
  <>
    <Route path="/requests" element={<FeedPage />} />
    <Route path="/me/requests" element={student(<MyRequestsPage />)} />
    <Route path="/me/requests/new" element={student(<NewRequestPage />)} />
    <Route path="/me/requests/:id" element={student(<RequestDetailPage />)} />
  </>
);
