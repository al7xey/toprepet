import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { RequireRole } from '../api/session';

const TutorProfilePage = lazy(() => import('../pages/tutor/profile'));
const WizardPage = lazy(() => import('../pages/tutor/wizard'));

/** Моя анкета и мастер анкеты. */
export const tutorProfileRoutes = (
  <>
    <Route path="/tutor/profile" element={<RequireRole role="tutor"><TutorProfilePage /></RequireRole>} />
    <Route path="/tutor/profile/edit" element={<RequireRole role="tutor"><WizardPage /></RequireRole>} />
  </>
);
