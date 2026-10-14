import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icon';
import { LINKS } from './links';
import './tr.css';
import './home.css';

function Logo({ size }: { size?: number }) {
  return (
    <Link className="logo" to={LINKS.home} aria-label="TopRepet, главная" style={size ? { fontSize: size } : undefined}>
      <i className="logo-mark" aria-hidden="true" style={size ? { width: 30, height: 30 } : undefined} />
      toprepet
    </Link>
  );
}

function A({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  if (to.startsWith('#')) {
    return <a className={className} href={to} onClick={(event) => event.preventDefault()}>{children}</a>;
  }
  return <Link className={className} to={to}>{children}</Link>;
}

export { A };

/** Каркас новых страниц: стеклянная шапка, контент, подвал. На телефоне вместо меню в шапке открывается экран меню. */
export function TrShell({ children, current }: { children: ReactNode; current?: 'catalog' | 'tutors' | 'blog' }) {
  const [menu, setMenu] = useState(false);
  const nav = (label: string, to: string, key: string) => (
    <A to={to} className={current === key ? 'cur' : undefined}>{label}</A>
  );
  return (
    <div className="tr">
      <div className="wash anim trh-page">
        <header className="hdr glass trh-hdr">
          <Logo />
          <nav className="trh-nav" aria-label="Основная навигация">
            {nav('Репетиторы', LINKS.catalog, 'catalog')}
            {nav('Для репетиторов', LINKS.tutors, 'tutors')}
            {nav('Блог', LINKS.blog, 'blog')}
          </nav>
          <span className="fr trh-actions" style={{ gap: 8 }}>
            <A to={LINKS.login} className="btn btn-fill btn-s">Войти</A>
            <A to={LINKS.signup} className="btn btn-primary btn-s">Регистрация</A>
          </span>
          <button type="button" className="btn btn-icon trh-burger" aria-label="Открыть меню" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Icon name="menu" />
          </button>
        </header>

        {children}

        <footer className="foot" style={{ marginTop: 'auto' }}>
          <div className="g8" style={{ alignContent: 'start' }}>
            <span className="logo" style={{ fontSize: 22 }}>
              <i className="logo-mark" style={{ width: 30, height: 30 }} aria-hidden="true" />
              toprepet
            </span>
            <p className="cap trh-foot-cap">Сервис частных репетиторов</p>
            <p className="muted sm">© 2026 TopRepet</p>
          </div>
          <nav aria-label="Ссылки в подвале">
            <A to={LINKS.tutors}>Для репетиторов</A>
            <A to={LINKS.help}>Помощь</A>
            <A to={LINKS.blog}>Блог</A>
            <A to={LINKS.docs}>Документы</A>
          </nav>
        </footer>
      </div>

      {menu && (
        <div className="wash trh-menu" role="dialog" aria-modal="true" aria-label="Меню">
          <header className="hdr m glass">
            <Logo />
            <button type="button" className="btn btn-icon" aria-label="Закрыть меню" onClick={() => setMenu(false)}>
              <Icon name="x" />
            </button>
          </header>
          <div className="trh-menu-list" onClick={() => setMenu(false)}>
            <A to={LINKS.catalog}>Репетиторы<Icon name="right" /></A>
            <A to={LINKS.request}>Заявки учеников<Icon name="right" /></A>
            <A to={LINKS.tutors}>Для репетиторов<Icon name="right" /></A>
            <A to={LINKS.blog}>Блог<Icon name="right" /></A>
            <A to={LINKS.help}>Помощь<Icon name="right" /></A>
          </div>
          <div className="g10" style={{ marginTop: 'auto' }}>
            <A to={LINKS.login} className="btn btn-fill btn-lg btn-block">Войти</A>
            <A to={LINKS.signup} className="btn btn-primary btn-lg btn-block">Регистрация</A>
          </div>
        </div>
      )}
    </div>
  );
}
