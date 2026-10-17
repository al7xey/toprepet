import { Component, type ErrorInfo, type ReactNode, lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { SeoMetadata } from './seo-metadata';
import { MetrikaTracker } from './metrika-tracker';
import { useScrollToSection } from '../shared/lib/use-scroll-to-section';
import { NewApp } from '../new-design/router';

const AdminBlog = lazy(() => import('../blog/admin').then(module => ({ default: module.AdminBlog })));

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="tr">
          <main id="main" className="trh-sec trh-notfound">
            <h1 className="trh-h1">Не удалось загрузить страницу</h1>
            <p className="lead">Попробуйте обновить страницу.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>Обновить</button>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
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
  // админка блога: отдельная простая оболочка, без сессии кабинетов и вне Метрики
  if (pathname === '/blog/admin' || pathname.startsWith('/blog/admin/')) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="trk-route-loading" aria-busy="true" />}>
          <Routes>
            <Route path="/blog/admin/login" element={<AdminBlog page="login" />} />
            <Route path="/blog/admin" element={<AdminBlog page="dashboard" />} />
            <Route path="/blog/admin/articles" element={<AdminBlog page="articles" />} />
            <Route path="/blog/admin/articles/new" element={<AdminBlog page="new" />} />
            <Route path="/blog/admin/articles/edit" element={<AdminBlog page="edit" />} />
            <Route path="/blog/admin/categories" element={<AdminBlog page="categories" />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary>
      <ScrollManager />
      <NewApp />
    </ErrorBoundary>
  );
}
