import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SpriteDefs } from '../ui/icons';
import { AppProvider } from '../ui/app-state';
import { LoginModal } from '../pages/auth/LoginModal';
import { DevPanel } from './DevPanel';
import { Guard } from './Guard';
import { startScheduler, useSession } from '../api';
import { Spinner } from '../ui/kit';

const Home = lazy(() => import('../pages/public/Home'));
const Catalog = lazy(() => import('../pages/public/Catalog'));
const Profile = lazy(() => import('../pages/public/Profile'));
const ProfileReviews = lazy(() => import('../pages/public/ProfileReviews'));
const GuestRequests = lazy(() => import('../pages/public/GuestRequests'));

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const Role = lazy(() => import('../pages/auth/Role'));
const Signup = lazy(() => import('../pages/auth/Signup'));
const YandexAuth = lazy(() => import('../pages/auth/YandexAuth'));
const YandexRole = lazy(() => import('../pages/auth/YandexRole'));
const Reset = lazy(() => import('../pages/auth/Reset'));
const NewPassword = lazy(() => import('../pages/auth/NewPassword'));

const Onboarding = lazy(() => import('../pages/student/Onboarding'));
const Cabinet = lazy(() => import('../pages/student/Cabinet'));
const Favorites = lazy(() => import('../pages/student/Favorites'));
const MyTutors = lazy(() => import('../pages/student/MyTutors'));
const Payments = lazy(() => import('../pages/student/Payments'));
const MyReviews = lazy(() => import('../pages/student/MyReviews'));
const Settings = lazy(() => import('../pages/common/Settings'));
const Notifications = lazy(() => import('../pages/common/Notifications'));
const Mail = lazy(() => import('../pages/common/Mail'));
const Help = lazy(() => import('../pages/common/Help'));
const Support = lazy(() => import('../pages/common/Support'));
const Messages = lazy(() => import('../pages/chat/Messages'));

const Pick = lazy(() => import('../pages/booking/Pick'));
const Checkout = lazy(() => import('../pages/booking/Checkout'));
const Intro = lazy(() => import('../pages/booking/Intro'));
const SeriesNew = lazy(() => import('../pages/booking/SeriesNew'));
const SeriesManage = lazy(() => import('../pages/booking/SeriesManage'));

const StudentLessons = lazy(() => import('../pages/lessons/StudentLessons'));
const StudentLesson = lazy(() => import('../pages/lessons/StudentLesson'));
const Move = lazy(() => import('../pages/lessons/Move'));
const Problem = lazy(() => import('../pages/lessons/Problem'));
const Dispute = lazy(() => import('../pages/lessons/Dispute'));
const ReviewForm = lazy(() => import('../pages/lessons/ReviewForm'));
const TutorLessons = lazy(() => import('../pages/lessons/TutorLessons'));
const TutorLesson = lazy(() => import('../pages/lessons/TutorLesson'));
const TutorSeries = lazy(() => import('../pages/lessons/TutorSeries'));
const TutorStudents = lazy(() => import('../pages/lessons/TutorStudents'));
const TutorDispute = lazy(() => import('../pages/lessons/TutorDispute'));

const NewRequest = lazy(() => import('../pages/requests/NewRequest'));
const MyRequests = lazy(() => import('../pages/requests/MyRequests'));
const Responses = lazy(() => import('../pages/requests/Responses'));
const TutorRequests = lazy(() => import('../pages/requests/TutorRequests'));
const TutorRequest = lazy(() => import('../pages/requests/TutorRequest'));
const TutorResponses = lazy(() => import('../pages/requests/TutorResponses'));

const Wizard = lazy(() => import('../pages/tutor/Wizard'));
const Exceptions = lazy(() => import('../pages/tutor/Exceptions'));
const Publish = lazy(() => import('../pages/tutor/Publish'));
const Preview = lazy(() => import('../pages/tutor/Preview'));
const Live = lazy(() => import('../pages/tutor/Live'));
const Documents = lazy(() => import('../pages/tutor/Documents'));
const TutorReviews = lazy(() => import('../pages/tutor/TutorReviews'));
const Finance = lazy(() => import('../pages/tutor/Finance'));
const PayoutSetup = lazy(() => import('../pages/tutor/PayoutSetup'));

const AdminDisputes = lazy(() => import('../pages/admin/AdminDisputes'));
const AdminReviews = lazy(() => import('../pages/admin/AdminReviews'));
const AdminDocuments = lazy(() => import('../pages/admin/AdminDocuments'));
const AdminCancellations = lazy(() => import('../pages/admin/AdminCancellations'));
const AdminComplaints = lazy(() => import('../pages/admin/AdminComplaints'));
const AdminSupport = lazy(() => import('../pages/admin/AdminSupport'));
const NotFound = lazy(() => import('../pages/common/NotFound'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }
  render() {
    if (this.state.error)
      return (
        <div className="desk-in" style={{ paddingTop: 80 }}>
          <div className="empty" style={{ justifySelf: 'center' }}>
            <h4>Не удалось открыть страницу</h4>
            <p>Обновите страницу. Если не поможет, напишите в поддержку.</p>
            <button className="btn btn--primary btn--m" type="button" onClick={() => location.reload()}>Обновить</button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function Home0() {
  const me = useSession();
  if (me?.role === 'tutor') return <Navigate to="/tutor/lessons" replace />;
  if (me?.role === 'admin') return <Navigate to="/admin/disputes" replace />;
  return <Home />;
}

export function App() {
  useEffect(() => {
    startScheduler();
  }, []);
  return (
    <AppProvider>
      <div className="app">
        <SpriteDefs />
        <a className="skip" href="#main">К содержимому</a>
        <ScrollTop />
        <ErrorBoundary>
          <Suspense fallback={<div className="loading-page"><Spinner /></div>}>
            <Routes>
              <Route path="/" element={<Home0 />} />
              <Route path="/teachers" element={<Catalog />} />
              <Route path="/teachers/:slug" element={<Profile />} />
              <Route path="/teachers/:slug/reviews" element={<ProfileReviews />} />
              <Route path="/teachers/:slug/book" element={<Guard role="student" title="Войдите, чтобы записаться"><Pick /></Guard>} />
              <Route path="/teachers/:slug/intro" element={<Guard role="student" title="Войдите, чтобы записаться на знакомство"><Intro /></Guard>} />
              <Route path="/teachers/:slug/series" element={<Guard role="student" title="Войдите, чтобы заниматься регулярно"><SeriesNew /></Guard>} />
              <Route path="/book/checkout" element={<Guard role="student"><Checkout /></Guard>} />
              <Route path="/requests" element={<GuestRequests />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<Role />} />
              <Route path="/signup/student" element={<Signup role="student" />} />
              <Route path="/signup/tutor" element={<Signup role="tutor" />} />
              <Route path="/signup/yandex" element={<YandexRole />} />
              <Route path="/auth/yandex" element={<YandexAuth />} />
              <Route path="/password/reset" element={<Reset />} />
              <Route path="/password/new" element={<NewPassword />} />

              <Route path="/start/:step" element={<Guard role="student"><Onboarding /></Guard>} />
              <Route path="/account" element={<Guard role="student"><Cabinet /></Guard>} />
              <Route path="/me/favorites" element={<Guard role="student" title="Войдите, чтобы открыть избранное"><Favorites /></Guard>} />
              <Route path="/account/tutors" element={<Guard role="student"><MyTutors /></Guard>} />
              <Route path="/account/payments" element={<Guard role="student"><Payments /></Guard>} />
              <Route path="/account/reviews" element={<Guard role="student"><MyReviews /></Guard>} />
              <Route path="/account/settings" element={<Guard><Settings /></Guard>} />
              <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
              <Route path="/mail" element={<Guard><Mail /></Guard>} />
              <Route path="/help" element={<Help />} />
              <Route path="/support" element={<Guard title="Войдите, чтобы написать в поддержку"><Support /></Guard>} />
              <Route path="/messages" element={<Guard roles={['student', 'tutor']}><Messages /></Guard>} />
              <Route path="/messages/:chatId" element={<Guard roles={['student', 'tutor']}><Messages /></Guard>} />

              <Route path="/my/lessons" element={<Guard role="student"><StudentLessons /></Guard>} />
              <Route path="/my/lessons/:id" element={<Guard role="student"><StudentLesson /></Guard>} />
              <Route path="/my/lessons/:id/move" element={<Guard role="student"><Move /></Guard>} />
              <Route path="/my/lessons/:id/problem" element={<Guard role="student"><Problem /></Guard>} />
              <Route path="/my/lessons/:id/review" element={<Guard role="student"><ReviewForm /></Guard>} />
              <Route path="/my/series/:id" element={<Guard role="student"><SeriesManage /></Guard>} />
              <Route path="/disputes/:id" element={<Guard role="student"><Dispute /></Guard>} />

              <Route path="/requests/new" element={<Guard role="student" title="Войдите, чтобы создать заявку"><NewRequest /></Guard>} />
              <Route path="/requests/:id/edit" element={<Guard role="student"><NewRequest /></Guard>} />
              <Route path="/my/requests" element={<Guard role="student"><MyRequests /></Guard>} />
              <Route path="/my/requests/:id" element={<Guard role="student"><Responses /></Guard>} />

              <Route path="/tutor" element={<Navigate to="/tutor/lessons" replace />} />
              <Route path="/tutor/lessons" element={<Guard role="tutor"><TutorLessons /></Guard>} />
              <Route path="/tutor/lessons/:id" element={<Guard role="tutor"><TutorLesson /></Guard>} />
              <Route path="/tutor/lessons/:id/move" element={<Guard role="tutor"><Move /></Guard>} />
              <Route path="/tutor/series/:id" element={<Guard role="tutor"><TutorSeries /></Guard>} />
              <Route path="/tutor/students" element={<Guard role="tutor"><TutorStudents /></Guard>} />
              <Route path="/tutor/disputes/:id" element={<Guard role="tutor"><TutorDispute /></Guard>} />
              <Route path="/tutor/requests" element={<Guard role="tutor"><TutorRequests /></Guard>} />
              <Route path="/tutor/requests/:id" element={<Guard role="tutor"><TutorRequest /></Guard>} />
              <Route path="/tutor/responses" element={<Guard role="tutor"><TutorResponses /></Guard>} />
              <Route path="/tutor/profile" element={<Guard role="tutor"><Live /></Guard>} />
              <Route path="/tutor/profile/edit" element={<Guard role="tutor"><Wizard /></Guard>} />
              <Route path="/tutor/profile/publish" element={<Guard role="tutor"><Publish /></Guard>} />
              <Route path="/tutor/profile/preview" element={<Guard role="tutor"><Preview /></Guard>} />
              <Route path="/tutor/profile/documents" element={<Guard role="tutor"><Documents /></Guard>} />
              <Route path="/tutor/schedule/exceptions" element={<Guard role="tutor"><Exceptions /></Guard>} />
              <Route path="/tutor/reviews" element={<Guard role="tutor"><TutorReviews /></Guard>} />
              <Route path="/tutor/finance" element={<Guard role="tutor"><Finance /></Guard>} />
              <Route path="/tutor/payouts/setup" element={<Guard role="tutor"><PayoutSetup /></Guard>} />

              <Route path="/admin" element={<Navigate to="/admin/disputes" replace />} />
              <Route path="/admin/disputes" element={<Guard role="admin"><AdminDisputes /></Guard>} />
              <Route path="/admin/disputes/:id" element={<Guard role="admin"><AdminDisputes /></Guard>} />
              <Route path="/admin/reviews" element={<Guard role="admin"><AdminReviews /></Guard>} />
              <Route path="/admin/documents" element={<Guard role="admin"><AdminDocuments /></Guard>} />
              <Route path="/admin/cancellations" element={<Guard role="admin"><AdminCancellations /></Guard>} />
              <Route path="/admin/complaints" element={<Guard role="admin"><AdminComplaints /></Guard>} />
              <Route path="/admin/support" element={<Guard role="admin"><AdminSupport /></Guard>} />
              <Route path="/admin/support/:chatId" element={<Guard role="admin"><AdminSupport /></Guard>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        <LoginModal />
        <DevPanel />
      </div>
    </AppProvider>
  );
}
