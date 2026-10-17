import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { homeFor, useSession } from '../../api/session';
import type { User } from '../../api/types';
import { AuthLayout } from '../../layout/layouts';
import { Button, EmptyState, ErrorState, FormError, Note, PageHeader, useToast } from '../../ui';
import { AuthCard } from './shared';

const RESEND_SECONDS = 60;

/** Куда вести после подтверждения почты: ученика — на онбординг, остальных — в их кабинет. */
export const afterVerify = (user: Pick<User, 'role' | 'onboarded'>) => (user.role === 'student' && !user.onboarded ? '/onboarding' : homeFor(user.role));

/** «Проверьте почту»: письмо отправлено, можно отправить ещё раз. */
export default function VerifyEmailPage() {
  const { user, setUser, checking } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [left, setLeft] = useState(RESEND_SECONDS);
  const resend = useMutation(async () => { await api.resendVerification(); return true; });
  const confirm = useMutation((token: string) => api.verifyEmail(token));

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  if (checking) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to={afterVerify(user)} replace />;

  const sendAgain = async () => {
    if (!(await resend.run())) return;
    setLeft(RESEND_SECONDS);
    toast('Письмо отправлено ещё раз');
  };
  // В демо-режиме писем нет: подтверждаем по кнопке. С настоящим бэкендом её нет, подтверждение идёт по ссылке из письма.
  const demoConfirm = async () => {
    const verified = await confirm.run('demo');
    if (verified) { setUser(verified); void navigate(afterVerify(verified), { replace: true }); }
  };

  return (
    <AuthLayout>
      <PageHeader title="Проверьте почту" lead={<>Мы отправили письмо на <b>{user.email}</b>. Откройте его и нажмите на ссылку, чтобы подтвердить адрес.</>} center />
      <AuthCard>
        <div className="trk-form">
          <Note tone="plain" icon="info">Письма может не быть пару минут. Загляните в папку «Спам» и проверьте, что адрес написан верно.</Note>
          <FormError error={resend.error ?? confirm.error} />
          <Button variant="line" size="lg" block onClick={sendAgain} disabled={left > 0} loading={resend.pending}>{left > 0 ? `Отправить ещё раз через ${left} с` : 'Отправить письмо ещё раз'}</Button>
          {api.mode === 'mock' && <Button size="lg" block onClick={demoConfirm} loading={confirm.pending}>Подтвердить почту (демо)</Button>}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

/** Ссылка из письма: /auth/verify?token=… */
export function VerifyByTokenPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { setUser } = useSession();
  const result = useQuery(token ? `verify-${token}` : null, () => api.verifyEmail(token));
  const verified = result.data;
  useEffect(() => { if (verified) setUser(verified); }, [verified, setUser]);

  if (verified) return <Navigate to={afterVerify(verified)} replace />;
  return (
    <AuthLayout>
      <PageHeader title="Подтверждаем почту" center />
      <AuthCard>
        {!token || result.error ? (
          <ErrorState text={result.error ?? 'Ссылка устарела или неполная. Войдите и запросите письмо ещё раз.'} onRetry={token ? result.reload : undefined} />
        ) : (
          <EmptyState icon="clock" title="Секунду…" text="Проверяем ссылку из письма." />
        )}
        {(!token || result.error) && <Button to="/login" variant="line" block>Перейти ко входу</Button>}
      </AuthCard>
    </AuthLayout>
  );
}
