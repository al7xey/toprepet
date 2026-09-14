import React, {
  useEffect,
  lazy,
  Suspense,
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import '@fontsource-variable/manrope';
import { store } from './store';
import { Header } from '../widgets/header/header';
import HomePage from '../pages/home/home-page';
import { Footer } from '../widgets/footer/footer';
import { messengers, messengerLink } from '../shared/config/contacts';
import './styles.css';
import './refinements.css';
import './experience.css';
const DirectionPage = lazy(() => import('../pages/direction/direction-page'));
const LessonsPage = lazy(() => import('../pages/lessons/lessons-page'));
const TeacherPage = lazy(() => import('../pages/teacher/teacher-page'));
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(error);
  }
  render() {
    return this.state.hasError ? (
      <div className="container not-found">
        <h1>
          Не удалось
          <br />
          загрузить страницу.
        </h1>
        <p>Попробуйте обновить страницу или напишите менеджеру в удобном мессенджере.</p>
        <div className="error-messenger-grid" aria-label="Мессенджеры для связи">
          {messengers.map((messenger) => (
            <a
              key={messenger.id}
              className="button error-messenger-button"
              href={messengerLink(messenger, 'Не загрузилась страница')}
              target="_blank"
              rel="noopener noreferrer"
            >
              {messenger.label}
            </a>
          ))}
        </div>
        <button
          className="button button-light error-refresh-button"
          onClick={() => window.location.reload()}
        >
          Обновить
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const scrollToAnchor = () => {
      const target = document.getElementById(hash.slice(1));
      if (!target) return false;
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
      return true;
    };
    // A deep link can target the FAQ before its deferred chunk has mounted.
    const observer = new MutationObserver(() => {
      if (scrollToAnchor()) observer.disconnect();
    });
    const frame = requestAnimationFrame(() => {
      if (!scrollToAnchor())
        observer.observe(document.getElementById('main')!, {
          childList: true,
          subtree: true,
        });
    });
    const timeout = window.setTimeout(() => observer.disconnect(), 10000);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pathname, hash, key]);
  return null;
}
function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <HashRouter>
          <ScrollManager />
          <a
            className="skip-link"
            href="#main"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('main')?.focus();
            }}
          >
            К содержимому
          </a>
          <Header />
          <main id="main" tabIndex={-1}>
            <Suspense
              fallback={
                <output className="container loading-block">
                  Загружаем занятия…
                </output>
              }
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/lessons" element={<LessonsPage />} />
                <Route path="/teacher/:id" element={<TeacherPage />} />
                <Route path="/direction/:id" element={<DirectionPage />} />
                <Route path="*" element={<DirectionPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </HashRouter>
      </Provider>
    </ErrorBoundary>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
