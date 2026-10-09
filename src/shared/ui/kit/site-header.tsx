import { Link } from 'react-router-dom';

import { LogoMark } from './icon';
import { Button } from './button';
import { routes } from './routes';

const guestNav = [
  { to: routes.lessons, label: 'Подобрать репетитора' },
  { to: routes.teachers, label: 'Репетиторы' },
  { to: routes.forTutors, label: 'Для репетиторов' },
  { to: routes.blog, label: 'Блог' },
];

export function Logo() {
  return (
    <Link className="tr-logo" to="/" aria-label="TopRepet — главная">
      <LogoMark />
      toprepet
    </Link>
  );
}

/* Guest header. Desktop: sticky liquid-glass capsule. Phone: logo + «Войти» in the page flow. */
export function SiteHeader({ current }: { current?: string }) {
  return (
    <>
      <header className="tr-site-top">
        <div className="tr-nv-header tr-glass">
          <Logo />
          <nav aria-label="Основная навигация">
            {guestNav.map(({ to, label }) => (
              <Link key={label} to={to} aria-current={label === current ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>
          <Link className="tr-nv-btn" to={routes.login}>Войти</Link>
        </div>
      </header>
      <header className="tr-m-top">
        <Logo />
        <Button variant="white" size="s" to={routes.login}>Войти</Button>
      </header>
    </>
  );
}
