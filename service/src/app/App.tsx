import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DEV_TOOLS } from '../api/config';
import { CabinetLayout, PublicLayout } from '../ui/layout';
import { Login } from '../pages/auth/Login';
import { Signup } from '../pages/auth/Signup';
import { Reset } from '../pages/auth/Reset';
import { ResetNew } from '../pages/auth/ResetNew';
import { Home } from '../pages/public/Home';
import { Teachers } from '../pages/public/Teachers';
import { TutorPage } from '../pages/public/TutorPage';
import { Book } from '../pages/booking/Book';
import { BookDone } from '../pages/booking/BookDone';
import { StudentLesson } from '../pages/lessons/StudentLesson';
import { Cabinet } from '../pages/student/Cabinet';
import { TutorHome } from '../pages/tutor/TutorHome';
import { TutorProfile } from '../pages/tutor/TutorProfile';
import { TutorSchedule } from '../pages/tutor/TutorSchedule';
import { Settings } from '../pages/common/Settings';
import { NotFound } from '../pages/common/NotFound';
import { DevMail } from '../pages/common/DevMail';
import { AdminHome } from '../pages/common/AdminHome';
import { GuestOnly, RequireRole } from './Guard';

/* Addresses from the spec end with a slash; the bare form is redirected to it. */
const SLASHED = /^\/(login|signup|reset|reset\/new|teachers|teachers\/[^/]+|cabinet|cabinet\/settings|tutor|tutor\/profile|tutor\/schedule|tutor\/settings|admin)$/;

export function App() {
  const { pathname, search, hash } = useLocation();
  if (SLASHED.test(pathname)) return <Navigate to={`${pathname}/${search}${hash}`} replace />;
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/teachers/" element={<Teachers />} />
        <Route path="/teachers/:id/" element={<TutorPage />} />
        <Route path="/book/:id" element={<RequireRole roles={['student']}><Book /></RequireRole>} />
        <Route path="/book/:id/done" element={<RequireRole roles={['student']}><BookDone /></RequireRole>} />
        <Route path="/login/" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup/" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/reset/" element={<Reset />} />
        <Route path="/reset/new/" element={<ResetNew />} />
        {DEV_TOOLS ? <Route path="/dev/mail" element={<DevMail />} /> : null}
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<CabinetLayout area="student" />}>
        <Route path="/cabinet/" element={<Cabinet />} />
        <Route path="/cabinet/lessons/:id" element={<StudentLesson />} />
        <Route path="/cabinet/settings/" element={<Settings />} />
      </Route>
      <Route element={<CabinetLayout area="tutor" />}>
        <Route path="/tutor/" element={<TutorHome />} />
        <Route path="/tutor/profile/" element={<TutorProfile />} />
        <Route path="/tutor/schedule/" element={<TutorSchedule />} />
        <Route path="/tutor/settings/" element={<Settings />} />
      </Route>
      <Route element={<CabinetLayout area="admin" />}>
        <Route path="/admin/" element={<AdminHome />} />
      </Route>
    </Routes>
  );
}
