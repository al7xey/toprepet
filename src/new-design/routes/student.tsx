import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const BookPage = lazy(() => import('../pages/student/book'));
const BookDonePage = lazy(() => import('../pages/student/done'));
const LessonsPage = lazy(() => import('../pages/student/lessons'));
const LessonPage = lazy(() => import('../pages/student/lesson'));
const AccountPage = lazy(() => import('../pages/student/account'));
const SettingsPage = lazy(() => import('../pages/student/settings'));
const ChatsPage = lazy(() => import('../pages/chats/list'));
const ChatPage = lazy(() => import('../pages/chats/view'));
const NewChatPage = lazy(() => import('../pages/chats/new'));
const ReviewPage = lazy(() => import('../pages/student/review'));
const ProblemPage = lazy(() => import('../pages/student/problem'));
const StudentDisputePage = lazy(() => import('../pages/student/dispute'));
const PaymentsPage = lazy(() => import('../pages/student/payments'));
const NotificationsPage = lazy(() => import('../pages/shared/notifications'));

const student = (page: React.ReactNode) => <RequireRole role="student">{page}</RequireRole>;

/** Кабинет ученика: запись, уроки, отзывы, платежи, уведомления, профиль. */
export const studentRoutes = (
  <>
    <Route path="/book/:id" element={student(<BookPage />)} />
    <Route path="/book/:id/done" element={student(<BookDonePage />)} />
    <Route path="/me/lessons" element={student(<LessonsPage />)} />
    <Route path="/me/lessons/:id" element={student(<LessonPage />)} />
    <Route path="/me/lessons/:id/review" element={student(<ReviewPage />)} />
    <Route path="/me/lessons/:id/problem" element={student(<ProblemPage />)} />
    <Route path="/me/disputes/:id" element={student(<StudentDisputePage />)} />
    <Route path="/me/payments" element={student(<PaymentsPage />)} />
    <Route path="/me/notifications" element={student(<NotificationsPage />)} />
    <Route path="/me/account" element={student(<AccountPage />)} />
    <Route path="/me/account/settings" element={student(<SettingsPage />)} />
    <Route path="/me/chats" element={student(<ChatsPage />)} />
    <Route path="/me/chats/new" element={student(<NewChatPage />)} />
    <Route path="/me/chats/:id" element={student(<ChatPage />)} />
  </>
);
