import {
  Component,
  type ReactNode,
  type ErrorInfo,
  lazy,
  Suspense,
  useEffect,
} from 'react';
import {
  Route,
  Routes,
  useLocation,
  useParams,
  Navigate,
} from 'react-router-dom';
import { Provider } from 'react-redux';

import { store } from './store';
import { SeoMetadata } from './seo-metadata';
import { MetrikaTracker } from './metrika-tracker';
import { useScrollToSection } from '../shared/lib/use-scroll-to-section';
import { Header } from '../widgets/header/header';
const HomePage = lazy(() => import('../pages/home/home-page'));
const DirectionPage = lazy(() => import('../pages/direction/direction-page'));
const TeacherPage = lazy(() => import('../pages/teacher/teacher-page'));
const TeachersPage = lazy(() => import('../pages/teachers/teachers-page'));
const ForTutorsPage = lazy(() => import('../pages/for-tutors/for-tutors-page'));
import { Footer } from '../widgets/footer/footer';
const PaymentRefundPage = lazy(() => import('../pages/legal/payment-refund-page'));
const LegalPage = lazy(() => import('../pages/legal/legal-page'));

import { MessengerLinks } from '../shared/ui/messenger-links';
import { Contact } from '../widgets/contact/contact';
import { ServiceDetails } from '../shared/ui/service-details';
const PublicBlog = lazy(() => import('../blog/public').then(module => ({ default: module.PublicBlog })));
const AdminBlog = lazy(() => import('../blog/admin').then(module => ({ default: module.AdminBlog })));

function LegacyTeacherRedirect() {
  const { id } = useParams();
  return <Navigate to={`/teachers/${id}/`} replace />;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container not-found">
          <h1>
            Не удалось
            <br />
            загрузить страницу.
          </h1>

          <p>
            Попробуйте обновить страницу или напишите менеджеру
            в удобном мессенджере.
          </p>

          <MessengerLinks
            topic="Не загрузилась страница"
            className="not-found-messengers"
          />

          <button
            className="button button-light error-refresh-button"
            onClick={() => window.location.reload()}
          >
            Обновить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/* One domain with the service (scripts/vercel-build.mjs marks the HTML with data-service="on"): the service owns
   / and /teachers/…, so a client-side link there from a landing page reloads the page to reach it. */
function ServiceHandoff() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (document.documentElement.dataset.service !== 'on') return;
    if (pathname === '/' || /^\/teachers(?:\/|$)/.test(pathname)) window.location.replace(pathname + search + hash);
  }, [pathname, search, hash]);
  return null;
}

function ScrollManager() {
  useScrollToSection();
  return null;
}

export function AppContent() {
  return <><SeoMetadata /><MetrikaTracker /><AppRoutes /></>;
}

function AppRoutes() {
  const { pathname } = useLocation();
  if (pathname === '/blog' || pathname.startsWith('/blog/')) {
    return <ErrorBoundary><Suspense fallback={<div className="container"><output>Загрузка страницы…</output></div>}><Routes>
      <Route path="/blog" element={<PublicBlog page="home" />} />
      <Route path="/blog/rubrics/*" element={<PublicBlog page="rubric" />} />
      <Route path="/blog/articles/:slug" element={<PublicBlog page="article" />} />
      <Route path="/blog/admin/login" element={<AdminBlog page="login" />} />
      <Route path="/blog/admin" element={<AdminBlog page="dashboard" />} />
      <Route path="/blog/admin/articles" element={<AdminBlog page="articles" />} />
      <Route path="/blog/admin/articles/new" element={<AdminBlog page="new" />} />
      <Route path="/blog/admin/articles/edit" element={<AdminBlog page="edit" />} />
      <Route path="/blog/admin/categories" element={<AdminBlog page="categories" />} />
      <Route path="*" element={<PublicBlog page="not-found" />} />
    </Routes></Suspense></ErrorBoundary>;
  }
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ScrollManager />
        <ServiceHandoff />

        <a
          className="skip-link"
          href="#main"
          onClick={(event) => {
            event.preventDefault();
            document
              .getElementById('main')
              ?.focus();
          }}
        >
          К содержимому
        </a>

        <Header />

        <main
          id="main"
          tabIndex={-1}
        >
          <Suspense fallback={<div className="container"><output>Загрузка страницы…</output></div>}>
          <Routes>
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/legal/payment-refund" element={<PaymentRefundPage />} />
            <Route path="/legal/:document" element={<LegalPage />} />
            <Route
              path="/"
              element={<HomePage />}
            />

            {/* Р-6, О3: the picker and the free intro are gone; the host answers these with a 301 */}
            <Route path="/lessons" element={<Navigate to="/teachers/" replace />} />
            <Route path="/free-intro" element={<Navigate to="/teachers/" replace />} />

            <Route
              path="/contact"
              element={
                <div className="manager-page">
                  <Contact standalone />
                  <ServiceDetails page="contact" />
                </div>
              }
            />

            <Route
              path="/for-repetitor"
              element={<ForTutorsPage />}
            />
            <Route path="/for-tutors" element={<Navigate to="/for-repetitor/" replace />} />

            <Route
              path="/teachers/:id"
              element={<TeacherPage />}
            />

            <Route path="/teacher/:id" element={<LegacyTeacherRedirect />} />

            <Route path="/teachers" element={<TeachersPage />} />

            <Route
              path="/direction/:id"
              element={<DirectionPage />}
            />

            <Route
              path="*"
              element={<DirectionPage />}
            />
          </Routes>
          </Suspense>
        </main>

        <Footer />
      </Provider>
    </ErrorBoundary>
  );
}
