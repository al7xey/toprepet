import { useApp } from '../../ui/app-state';
import { Sheet } from '../../ui/kit';
import { LoginForm } from './shared';
import { nb } from '../../lib/text';

/* «Войдите, чтобы продолжить»: a window over the page on desktop, a sheet on phones.
   After signing in the person stays where they were and the action continues. */
export function LoginModal() {
  const { login, closeLogin } = useApp();
  if (!login) return null;
  return (
    <Sheet open onClose={closeLogin} title={login.title}>
      <p className="sub" style={{ marginTop: -6 }}>{nb(login.text ?? 'После входа вернём вас туда, где вы были: к записи, сообщению или заявке.')}</p>
      <LoginForm returnTo={login.returnTo} after={login.after} onDone={closeLogin} />
    </Sheet>
  );
}
