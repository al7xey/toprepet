import type { ReactNode } from 'react';
import { useSession } from '../api';
import type { Role } from '../api/types';
import { LoginScreen } from '../pages/auth/LoginPage';
import { Page } from '../ui/layout';
import { Btn, Empty } from '../ui/kit';
import { auth } from '../api';

/* Pages that need an account: guests see the login form in place and continue right where they were. */
export function Guard({ role, roles, title, children }: { role?: Role; roles?: Role[]; title?: string; children: ReactNode }) {
  const me = useSession();
  if (!me) return <LoginScreen title={title ?? 'Войдите, чтобы продолжить'} />;
  const allowed = roles ?? (role ? [role] : null);
  if (allowed && !allowed.includes(me.role)) {
    const home = me.role === 'tutor' ? '/tutor/lessons' : me.role === 'admin' ? '/admin/disputes' : '/my/lessons';
    const text = me.role === 'tutor'
      ? 'Вы вошли как репетитор. Учиться можно с отдельного аккаунта ученика с другой почтой.'
      : me.role === 'student'
        ? 'Вы вошли как ученик. Чтобы преподавать, нужен отдельный аккаунт репетитора с другой почтой.'
        : 'Раздел недоступен для админки.';
    return (
      <Page title="Раздел недоступен" kind="site">
        <Empty icon="lock" title="Этот раздел для другой роли" style={{ justifySelf: 'center', marginTop: 40 }} action={<div className="row-s" style={{ justifyContent: 'center' }}><Btn v="primary" to={home}>В свой кабинет</Btn><Btn onClick={() => auth.logout()}>Выйти</Btn></div>}>{text}</Empty>
      </Page>
    );
  }
  return <>{children}</>;
}
