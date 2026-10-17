import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const BookPage = lazy(() => import('../pages/student/book'));
const BookDonePage = lazy(() => import('../pages/student/done'));
const LessonsPage = lazy(() => import('../pages/student/lessons'));
const LessonPage = lazy(() => import('../pages/student/lesson'));
const AccountPage = lazy(() => import('../pages/student/account'));

const student = (page: React.ReactNode) => <RequireRole role="student">{page}</RequireRole>;

/** Кабинет ученика: запись, уроки, профиль. */
export const studentRoutes = (
  <>
    <Route path="/book/:id" element={student(<BookPage />)} />
    <Route path="/book/:id/done" element={student(<BookDonePage />)} />
    <Route path="/me/lessons" element={student(<LessonsPage />)} />
    <Route path="/me/lessons/:id" element={student(<LessonPage />)} />
    <Route path="/me/account" element={student(<AccountPage />)} />
  </>
);
