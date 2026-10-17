import { lazy } from 'react';
import { Navigate, Route, useParams } from 'react-router-dom';

// Пути модулей совпадают с теми, что знает пререндер (scripts/prerender.mjs), чтобы стили грузились заранее.
const HomePage = lazy(() => import('../../pages/home/home-page'));
const CatalogPage = lazy(() => import('../../pages/teachers/teachers-page'));
const ProfilePage = lazy(() => import('../../pages/teacher/teacher-page'));
const HelpPage = lazy(() => import('../pages/public/help'));
const LegalPage = lazy(() => import('../pages/public/legal'));
const BlogPage = lazy(() => import('../pages/public/blog'));
const TutorsLandingPage = lazy(() => import('../../pages/for-tutors/for-tutors-page'));

function TeacherRedirect() {
  const { id } = useParams();
  return <Navigate to={`/teachers/${id}`} replace />;
}

/** Старые адреса остаются рабочими: ссылки из поиска и чужих сайтов ведут на новые страницы. */
export const publicRoutes = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/teachers" element={<CatalogPage />} />
    <Route path="/teachers/:id" element={<ProfilePage />} />
    <Route path="/for-repetitor" element={<TutorsLandingPage />} />
    <Route path="/help" element={<HelpPage />} />
    <Route path="/lessons" element={<Navigate to="/teachers" replace />} />
    <Route path="/contact" element={<Navigate to="/help" replace />} />
    <Route path="/free-intro" element={<Navigate to="/teachers?intro=1" replace />} />
    <Route path="/direction/:id" element={<Navigate to="/teachers" replace />} />
    <Route path="/for-tutors" element={<Navigate to="/for-repetitor" replace />} />
    <Route path="/teacher/:id" element={<TeacherRedirect />} />
    <Route path="/blog" element={<BlogPage page="home" />} />
    <Route path="/blog/rubrics/*" element={<BlogPage page="rubric" />} />
    <Route path="/blog/articles/:slug" element={<BlogPage page="article" />} />
    <Route path="/legal" element={<LegalPage />} />
    <Route path="/legal/:document" element={<LegalPage />} />
  </>
);
