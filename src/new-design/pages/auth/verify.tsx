import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { homeFor, useSession } from '../../api/session';
import type { User } from '../../api/types';
import { AuthLayout } from '../../layout/layouts';
import { safeNext } from '../../lib/safeNext';
import { Button, EmptyState, ErrorState, FormError, Note, PageHeader, TextField, useToast } from '../../ui';
import { AuthCard } from './shared';

const RESEND_SECONDS = 60;

/** Куда вести после подтверждения почты: ученика — на онбординг, остальных — в их кабинет. */
export const afterVerify = (user: Pick<User, 'role' | 'onboarded'>, next?: string | null) => {
  if (!user.onboarded && user.role === 'tutor') return '/tutor/profile/edit';
  const destination = safeNext(next, '');
  if (!user.onboarded && user.role === 'student') return '/onboarding' + (destination && !destination.startsWith('/onboarding') ? `?next=${encodeURIComponent(destination)}` : '');
  return destination || homeFor(user.role);
};

/** «Проверьте почту»: письмо отправлено, можно отправить ещё раз. */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const { user, setUser, checking } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [left, setLeft] = useState(params.get('sent') === '1' ? RESEND_SECONDS : 0);
  const [code, setCode] = useState('');
  const resend = useMutation(async () => { await api.resendVerification(); return true; });
  const confirm = useMutation((token: string) => api.verifyEmail(token));

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  if (checking) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to={afterVerify(user, next)} replace />;

  const sendAgain = async () => {
    if (!(await resend.run())) return;
    setLeft(RESEND_SECONDS);
    toast('Письмо отправлено ещё раз');
  };
  const submitCode = async () => {
    if (!/^\d{6}$/.test(code)) return;
    const verified = await confirm.run(code);
    if (verified) { setUser(verified); void navigate(afterVerify(verified, next), { replace: true }); }
  };

  return (
    <AuthLayout>
      <PageHeader title="Проверьте почту" lead={<>Введите шестизначный код для <b>{user.email}</b>. Код действует 10 минут. Если письма нет, запросите новый код.</>} center />
      <AuthCard>
        <form className="trk-form" onSubmit={(event) => { event.preventDefault(); void submitCode(); }}>
          <TextField label="Код из письма" name="verificationCode" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); confirm.reset(); }} inputMode="numeric" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} maxLength={12} placeholder="000000" />
          {api.mode === 'mock' && <Note tone="plain">Демо-код — 123456. В этой версии письма не отправляются.</Note>}
          <Button type="submit" block disabled={code.length !== 6} loading={confirm.pending}>Подтвердить почту</Button>
          <FormError error={resend.error ?? confirm.error} />
          <Button variant="line" size="lg" block onClick={sendAgain} disabled={left > 0} loading={resend.pending}>{left > 0 ? `Запросить код · ${left} с` : 'Отправить код ещё раз'}</Button>
        </form>
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
