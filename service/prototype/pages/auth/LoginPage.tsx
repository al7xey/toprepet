import { useLocation, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { LoginForm } from './shared';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../api';
import { Note } from '../../ui/kit';

export function LoginScreen({ title = 'Вход', sub }: { title?: string; sub?: string }) {
  const location = useLocation();
  const [sp] = useSearchParams();
  const returnTo = sp.get('return') ?? (location.pathname === '/login' ? '/' : location.pathname + location.search);
  return (
    <Page title={title} kind="site" back="/" mTitle="Вход">
      <div className="r1-auth" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <h1 className="h2">{title}</h1>
          <p className="sub">{sub ?? 'После входа продолжим с того же места.'}</p>
        </div>
        <LoginForm returnTo={returnTo} />
        <Note icon="info">{`Демо-аккаунты, пароль ${DEMO_PASSWORD}: ${DEMO_ACCOUNTS.map(a => a.email).join(', ')}`}</Note>
      </div>
    </Page>
  );
}

export default function LoginPage() {
  return <LoginScreen title="Вход" sub="Почта и пароль или Яндекс ID." />;
}
