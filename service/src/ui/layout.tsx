import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '../api/auth';
import { BLOG_URL, SUPPORT_TELEGRAM, SUPPORT_URL } from '../api/config';
import { useSession } from '../api/session';
import { ROLE_HOME, type Role } from '../api/types';
import { first } from '../lib/names';
import { RequireRole } from '../app/Guard';
import { Brand } from './Brand';
import { ErrorBoundary } from './ErrorBoundary';
import { Overlay } from './Overlay';

interface MenuItem {
  to: string;
  label: string;
}

/* Cabinet sections. Items join the menu in the iteration that builds their pages. */
const CABINET_MENU: Record<Role, MenuItem[]> = {
  student: [
    { to: '/cabinet/', label: 'Мои занятия' },
    { to: '/cabinet/settings/', label: 'Настройки' },
  ],
  tutor: [
    { to: '/tutor/', label: 'Сводка' },
    { to: '/tutor/profile/', label: 'Анкета' },
    { to: '/tutor/schedule/', label: 'Расписание' },
    { to: '/tutor/settings/', label: 'Настройки' },
  ],
  admin: [{ to: '/admin/', label: 'Админка' }],
};

const PUBLIC_NAV: MenuItem[] = [
  { to: '/', label: 'Подобрать репетитора' },
  { to: '/teachers/', label: 'Репетиторы' },
  { to: '/signup/?role=tutor', label: 'Для репетиторов' },
];

function useLogout() {
  const navigate = useNavigate();
  return async () => {
    await signOut();
    await navigate('/', { replace: true });
  };
}

function PublicNav() {
  const { pathname } = useLocation();
  return (
    <nav className="nav" aria-label="Разделы сайта">
      {PUBLIC_NAV.map(item => {
        const on = item.to === pathname;
        return (
          <Link key={item.to} to={item.to} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
      <a href={BLOG_URL}>Блог</a>
    </nav>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile } = useSession();
  const logout = useLogout();
  const items = profile ? CABINET_MENU[profile.role] : PUBLIC_NAV;
  return (
    <Overlay open={open} onClose={onClose} className="menu" label="Меню">
      <div className="row sb nw" style={{ padding: '0 6px 10px' }}>
        <Brand to={profile ? ROLE_HOME[profile.role] : '/'} />
        <button type="button" className="x" aria-label="Закрыть меню" onClick={onClose} />
      </div>
      {items.map(item => (
        <NavLink key={item.to} to={item.to} end className={({ isActive }) => (isActive ? 'on' : undefined)} onClick={onClose}>
          {item.label}
        </NavLink>
      ))}
      <hr />
      {profile ? (
        <>
          {profile.role !== 'admin' ? <NavLink to="/teachers/" onClick={onClose}>
              Репетиторы
            </NavLink> : null}
          <a href={BLOG_URL}>Блог</a>
          <button
            type="button"
            className="mi"
            onClick={() => {
              onClose();
              void logout();
            }}
          >
            Выйти
          </button>
        </>
      ) : (
        <>
          <a href={BLOG_URL}>Блог</a>
          <NavLink to="/login/" onClick={onClose}>
            Войти
          </NavLink>
        </>
      )}
    </Overlay>
  );
}

export function Header() {
  const { user, profile, loading } = useSession();
  const location = useLocation();
  const [menu, setMenu] = useState(false);

  const next = `${location.pathname}${location.search}`;
  const loginHref = location.pathname.startsWith('/login') ? '/login/' : `/login/?next=${encodeURIComponent(next)}`;

  return (
    <header className="hd">
      <Brand to={profile ? ROLE_HOME[profile.role] : '/'} />
      {profile?.role === 'admin' ? null : <PublicNav />}
      <span className="sp" />
      <div className="acts">
        {profile ? (
          <Link className="who" to={ROLE_HOME[profile.role]} aria-label={`Кабинет: ${profile.name}`}>
            <span className="cnt">
              <span className="av" aria-hidden="true">
                {first(profile.name).slice(0, 1).toUpperCase()}
              </span>
            </span>
            <span className="nm">{profile.name}</span>
          </Link>
        ) : loading && user ? null : (
          <>
            <span className="only-d">
              <Link className="btn s p" to="/teachers/">
                Подобрать репетитора
              </Link>
            </span>
            <Link className="btn s" to={loginHref}>
              Войти
            </Link>
          </>
        )}
        <button type="button" className="burger only-m" aria-label="Открыть меню" aria-haspopup="dialog" onClick={() => setMenu(true)}>
          <b />
          <b />
          <b />
        </button>
      </div>
      <MobileMenu open={menu} onClose={() => setMenu(false)} />
    </header>
  );
}

function SkipLink() {
  return (
    <a className="skip" href="#main">
      К содержанию
    </a>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <Brand />
      <span className="mut">Сервис частных репетиторов</span>
      <div className="cols">
        <Link to="/signup/?role=tutor">Для репетиторов</Link>
        <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
          Написать в&nbsp;поддержку
        </a>
        <a href={BLOG_URL}>Блог</a>
        <a href="https://toprepet.ru/documents/">Документы</a>
      </div>
      <span className="mut sm">© 2026 TopRepet</span>
    </footer>
  );
}

/** Public pages, auth pages, 404: header, content column, site footer. */
export function PublicLayout() {
  const { pathname } = useLocation();
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main" className="main" tabIndex={-1}>
        <div className="ct pg">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
      <Footer />
    </>
  );
}

/** Cabinet shell: left column from 1000 px, the same items in the slide-out menu below. */
export function CabinetLayout({ area: role }: { area: Role }) {
  const { pathname } = useLocation();
  const logout = useLogout();
  return (
    <>
      <SkipLink />
      <Header />
      <RequireRole roles={[role]}>
      <div className="shell">
        <nav className="side" aria-label="Кабинет">
          {CABINET_MENU[role].map(item => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => (isActive ? 'on' : undefined)}>
              {item.label}
            </NavLink>
          ))}
          <button type="button" className="mut" onClick={() => void logout()}>
            Выйти
          </button>
        </nav>
        <main id="main" className="ct pg" tabIndex={-1}>
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
        <div className="foot1">
          <span>
            Поддержка в&nbsp;Telegram:{' '}
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer">
              {SUPPORT_TELEGRAM}
            </a>
          </span>
          <span>© 2026 TopRepet</span>
        </div>
      </div>
      </RequireRole>
    </>
  );
}
