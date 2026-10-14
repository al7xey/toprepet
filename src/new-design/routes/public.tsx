import { lazy } from 'react';
import { Route } from 'react-router-dom';

// Пути модулей совпадают с теми, что знает пререндер (scripts/prerender.mjs), чтобы стили грузились заранее.
const HomePage = lazy(() => import('../../pages/home/home-page'));
const CatalogPage = lazy(() => import('../../pages/teachers/teachers-page'));
const ProfilePage = lazy(() => import('../../pages/teacher/teacher-page'));
const TutorsLandingPage = lazy(() => import('../../pages/for-tutors/for-tutors-page'));

export const publicRoutes = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/teachers" element={<CatalogPage />} />
    <Route path="/teachers/:id" element={<ProfilePage />} />
    <Route path="/for-repetitor" element={<TutorsLandingPage />} />
  </>
);
