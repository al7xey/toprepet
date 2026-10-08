import { Navigate } from 'react-router-dom';
import { useDb, useSession, tutorById } from '../../api';
import { ProfileView } from '../public/Profile';

/* The tutor's own profile exactly as students see it, with booking buttons switched off. */
export default function Preview() {
  const d = useDb();
  const me = useSession()!;
  const t = tutorById(d, me.id);
  if (!t) return <Navigate to="/tutor/lessons" replace />;
  return <ProfileView t={t} preview />;
}
