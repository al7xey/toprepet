import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const TutorLessonsPage = lazy(() => import('../pages/tutor/lessons'));
const TutorLessonPage = lazy(() => import('../pages/tutor/lesson'));
const SchedulePage = lazy(() => import('../pages/tutor/schedule'));
const FinancePage = lazy(() => import('../pages/tutor/finance'));
const TutorStudentsPage = lazy(() => import('../pages/tutor/students'));
const TutorAccountPage = lazy(() => import('../pages/tutor/account'));
const TutorRequestsPage = lazy(() => import('../pages/requests/tutor'));
const TutorChatsPage = lazy(() => import('../pages/chats/tutor-list'));
const TutorChatPage = lazy(() => import('../pages/chats/tutor-view'));

const tutor = (page: React.ReactNode) => <RequireRole role="tutor">{page}</RequireRole>;

/** Кабинет репетитора: уроки, расписание, финансы, ученики, настройки. */
export const tutorRoutes = (
  <>
    <Route path="/tutor/lessons" element={tutor(<TutorLessonsPage />)} />
    <Route path="/tutor/lessons/:id" element={tutor(<TutorLessonPage />)} />
    <Route path="/tutor/schedule" element={tutor(<SchedulePage />)} />
    <Route path="/tutor/finance" element={tutor(<FinancePage />)} />
    <Route path="/tutor/students" element={tutor(<TutorStudentsPage />)} />
    <Route path="/tutor/account" element={tutor(<TutorAccountPage />)} />
    <Route path="/tutor/requests" element={tutor(<TutorRequestsPage />)} />
    <Route path="/tutor/chats" element={tutor(<TutorChatsPage />)} />
    <Route path="/tutor/chats/:id" element={tutor(<TutorChatPage />)} />
  </>
);
