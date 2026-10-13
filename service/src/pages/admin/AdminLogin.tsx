import { useSearchParams } from 'react-router-dom';
import { safeNext } from '../../app/Guard';
import { usePageMeta } from '../../ui/meta';
import { LoginForm } from '../auth/LoginForm';

/** /admin/login (mockup adminLogin): a separate entrance for staff; the admin role is given only in the database. */
export function AdminLogin() {
  usePageMeta('Вход в админку', { noindex: true });
  const [params] = useSearchParams();
  return (
    <div className="center stack">
      <h1 className="h1">Вход в&nbsp;админку</h1>
      <LoginForm next={safeNext(params.get('next')) ?? '/admin/lessons'} emailLabel="Рабочий email" staff />
    </div>
  );
}
