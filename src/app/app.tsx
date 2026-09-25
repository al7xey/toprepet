import {
  useEffect,
  useRef,
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import {
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Provider } from 'react-redux';

import { store } from './store';
import { Header } from '../widgets/header/header';
import HomePage from '../pages/home/home-page';
import DirectionPage from '../pages/direction/direction-page';
import LessonsPage from '../pages/lessons/lessons-page';
import TeacherPage from '../pages/teacher/teacher-page';
import FreeIntroPage from '../pages/free-intro/free-intro-page';
import { TeachersPage, DirectionsPage, HowItWorksPage, PricePage, FaqPage } from '../pages/sections/section-pages';
import { Footer } from '../widgets/footer/footer';
import { MessengerLinks } from '../shared/ui/messenger-links';
import { Contact } from '../widgets/contact/contact';

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

function ScrollManager() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const scrollToAnchor = () => {
      const target = document.getElementById(
        hash.slice(1),
      );

      if (!target) {
        return false;
      }

      target.scrollIntoView({
        behavior: window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches
          ? 'instant'
          : 'smooth',
      });

      return true;
    };

    const observer = new MutationObserver(() => {
      if (scrollToAnchor()) {
        observer.disconnect();
      }
    });

    const frame = requestAnimationFrame(() => {
      if (!scrollToAnchor()) {
        const main =
          document.getElementById('main');

        if (main) {
          observer.observe(main, {
            childList: true,
            subtree: true,
          });
        }
      }
    });

    const timeout = window.setTimeout(
      () => observer.disconnect(),
      10000,
    );

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [pathname, hash, key]);

  return null;
}

function MetrikaTracker() {
  const { pathname, search } = useLocation();

  const previousUrl = useRef<string | null>(
    null,
  );

  useEffect(() => {
    const metrika = (
      window as typeof window & {
        ym?: (
          counterId: number,
          method: string,
          url: string,
          options?: {
            referer?: string;
          },
        ) => void;
      }
    ).ym;

    if (!metrika) {
      return;
    }

    const currentUrl =
      window.location.origin +
      pathname +
      search;

    metrika(
      112922088,
      'hit',
      currentUrl,
      {
        referer:
          previousUrl.current ??
          document.referrer,
      },
    );

    previousUrl.current = currentUrl;
  }, [pathname, search]);

  return null;
}

export function AppContent() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ScrollManager />
        <MetrikaTracker />

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
          <Routes>
            <Route
              path="/"
              element={<HomePage />}
            />

            <Route
              path="/lessons"
              element={<LessonsPage />}
            />

            <Route
              path="/contact"
              element={
                <div className="manager-page">
                  <Contact standalone />
                </div>
              }
            />

            <Route
              path="/free-intro"
              element={<FreeIntroPage />}
            />

            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/directions" element={<DirectionsPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/price" element={<PricePage />} />
            <Route path="/faq" element={<FaqPage />} />

            <Route
              path="/teacher/:id"
              element={<TeacherPage />}
            />

            <Route
              path="/direction/:id"
              element={<DirectionPage />}
            />

            <Route
              path="*"
              element={<DirectionPage />}
            />
          </Routes>
        </main>

        <Footer />
      </Provider>
    </ErrorBoundary>
  );
}
