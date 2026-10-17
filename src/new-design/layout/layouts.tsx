import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useQuery } from '../api/hooks';
import { homeFor, useSession } from '../api/session';
import type { Role } from '../api/types';
import { Avatar, Button, Icon, IconButton } from '../ui';

const cx = (...p: (string | false | undefined)[]) => p.filter(Boolean).join(' ');

function Logo() {
  return <Link className="logo" to="/" aria-label="TopRepet, главная"><i className="logo-mark" aria-hidden="true" />toprepet</Link>;
}

function Footer() {
  return (
    <footer className="foot">
      <div className="g8 u-align-start">
        <span className="logo logo-l"><i className="logo-mark" aria-hidden="true" />toprepet</span>
        <p className="cap trh-foot-cap">Сервис частных репетиторов</p>
        <p className="muted sm">© 2026 TopRepet</p>
      </div>
      <nav aria-label="Ссылки в подвале">
        <Link to="/for-repetitor/">Для репетиторов</Link>
        <Link to="/help">Помощь</Link>
        <Link to="/blog">Блог</Link>
        <Link to="/legal/">Документы</Link>
      </nav>
    </footer>
  );
}

const PUBLIC_NAV: [string, string][] = [['Репетиторы', '/teachers'], ['Для репетиторов', '/for-repetitor'], ['Блог', '/blog']];

/** Правая часть шапки: войти/регистрация или вход в кабинет. */
function SessionActions({ block }: { block?: boolean }) {
  const { user } = useSession();
  if (user) {
    return <Button to={homeFor(user.role)} size={block ? 'lg' : 's'} block={block} icon="user">{user.role === 'tutor' ? 'Кабинет репетитора' : user.role === 'admin' ? 'Админка' : 'Мои уроки'}</Button>;
  }
  return <Button size={block ? 'lg' : 's'} block={block} to="/login">Войти</Button>;
}

/** Публичные страницы: стеклянная шапка, контент, подвал; на телефоне меню открывается отдельным экраном. */
export function PublicLayout({ children, tight, bareMobile, narrow, hideSignIn }: { children: ReactNode; tight?: boolean; bareMobile?: boolean; narrow?: boolean; hideSignIn?: boolean }) {
  const { pathname } = useLocation();
  const { user } = useSession();
  // меню закрывается само при переходе: открытым оно считается только на той странице, где его открыли
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menu = menuAt === pathname;
  const setMenu = (open: boolean) => setMenuAt(open ? pathname : null);
  // вошедшие ученик и репетитор остаются в своей оболочке: «Найти репетитора» не выбрасывает на экран до входа
  if (user && user.role !== 'admin' && /^\/(teachers|help|requests)(\/|$)/.test(pathname)) return <AppLayout role={user.role}>{children}</AppLayout>;
  return (
    <>
      <div className={cx('wash trh-page', tight && 'trh-tight', bareMobile && 'trh-bare')}>
        {/* шапка одна и та же при открытом меню: логотип и кнопка не сдвигаются, меню открывается под ней */}
        <header className={cx('hdr surf trh-hdr', menu && 'trh-hdr-open')}>
          <Logo />
          <nav className="trh-nav" aria-label="Основная навигация">
            {PUBLIC_NAV.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'cur' : undefined)}>{label}</NavLink>)}
          </nav>
          {!hideSignIn && <span className="fr trh-actions"><SessionActions /></span>}
          <button type="button" className="btn btn-icon trh-burger" aria-label={menu ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name={menu ? 'x' : 'menu'} /></button>
        </header>
        {menu && (
          <dialog open className="trh-menu" aria-modal="true" aria-label="Меню">
            <nav className="trh-menu-list" aria-label="Меню">
              {[...PUBLIC_NAV, ...(user ? [['Заявки учеников', '/requests']] : []), ['Помощь', '/help'], ...(user ? [] : [['Регистрация', '/signup']])].map(([label, to]) => <Link key={to} to={to}>{label}<Icon name="right" /></Link>)}
            </nav>
            <div className="g10 u-mt-auto"><SessionActions block /></div>
          </dialog>
        )}
        <main id="main" tabIndex={-1} className={cx('trh-main', narrow && 'trk-narrow')}>{children}</main>
        <Footer />
      </div>
    </>
  );
}

/** Вход, регистрация, восстановление: публичная шапка и узкая колонка по центру. */
export function AuthLayout({ children }: { children: ReactNode }) {
  // на экранах входа и регистрации кнопка «Войти» в шапке не нужна
  return <PublicLayout tight narrow hideSignIn>{children}</PublicLayout>;
}

interface NavItem { label: string; to: string; icon: string; badge?: number }

function useCounters(role: Role) {
  const { user } = useSession();
  const notes = useQuery(user ? `notes-${user.id}` : null, () => api.listNotifications());
  const reloadNotes = notes.reload;
  useEffect(() => {
    window.addEventListener('tr:notes', reloadNotes);
    return () => window.removeEventListener('tr:notes', reloadNotes);
  }, [reloadNotes]);
  const chats = useQuery(user ? `chats-${user.id}` : null, () => api.listConversations());
  const prefix = role === 'tutor' ? '/tutor' : '/me';
  return {
    notifications: notes.data?.filter((n) => !n.read).length ?? 0,
    chats: chats.data?.reduce((a, c) => a + c.unread, 0) ?? 0,
    prefix,
  };
}

/**
 * Разделы кабинета, у которых уже есть страницы. Остальных в меню нет, чтобы ни одна кнопка не вела на 404.
 * По мере сборки страниц сюда добавляются адреса (заявки, чаты, платежи, уведомления, админка).
 */
const READY = ['/teachers', '/me/lessons', '/me/account', '/me/requests', '/me/chats', '/tutor/requests', '/tutor/chats', '/tutor/lessons', '/tutor/schedule', '/tutor/finance', '/tutor/profile', '/tutor/students', '/tutor/account', '/me/payments', '/me/notifications', '/tutor/notifications', '/tutor/reviews', '/admin'];
const ready = (to: string) => READY.some((p) => to === p || to.startsWith(`${p}/`));

const NAV: Record<Role, { top: NavItem[]; tabs: NavItem[] }> = {
  student: {
    top: [{ label: 'Найти репетитора', to: '/teachers', icon: 'search' }, { label: 'Мои уроки', to: '/me/lessons', icon: 'cal' }, { label: 'Заявки', to: '/me/requests', icon: 'list' }, { label: 'Платежи', to: '/me/payments', icon: 'card' }],
    tabs: [{ label: 'Найти', to: '/teachers', icon: 'search' }, { label: 'Уроки', to: '/me/lessons', icon: 'cal' }, { label: 'Заявки', to: '/me/requests', icon: 'list' }, { label: 'Чаты', to: '/me/chats', icon: 'chat' }, { label: 'Профиль', to: '/me/account', icon: 'user' }],
  },
  tutor: {
    top: [{ label: 'Уроки', to: '/tutor/lessons', icon: 'cal' }, { label: 'Расписание', to: '/tutor/schedule', icon: 'clock' }, { label: 'Ученики', to: '/tutor/students', icon: 'person-plus' }, { label: 'Заявки', to: '/tutor/requests', icon: 'list' }, { label: 'Финансы', to: '/tutor/finance', icon: 'wallet' }, { label: 'Отзывы', to: '/tutor/reviews', icon: 'star' }, { label: 'Анкета', to: '/tutor/profile', icon: 'user' }],
    tabs: [{ label: 'Уроки', to: '/tutor/lessons', icon: 'cal' }, { label: 'Заявки', to: '/tutor/requests', icon: 'list' }, { label: 'Чаты', to: '/tutor/chats', icon: 'chat' }, { label: 'Финансы', to: '/tutor/finance', icon: 'wallet' }, { label: 'Анкета', to: '/tutor/profile', icon: 'user' }],
  },
  admin: {
    top: [{ label: 'Споры', to: '/admin/disputes', icon: 'flag' }, { label: 'Отмены', to: '/admin/cancellations', icon: 'x' }, { label: 'Отзывы', to: '/admin/reviews', icon: 'star' }, { label: 'Анкеты', to: '/admin/profiles', icon: 'school' }],
    tabs: [{ label: 'Споры', to: '/admin/disputes', icon: 'flag' }, { label: 'Отмены', to: '/admin/cancellations', icon: 'x' }, { label: 'Отзывы', to: '/admin/reviews', icon: 'star' }, { label: 'Анкеты', to: '/admin/profiles', icon: 'school' }],
  },
};

/**
 * Кабинет ученика, репетитора или администратора.
 * Компьютер: стеклянная шапка с разделами и значками. Телефон: без закреплённой шапки, снизу стеклянная панель вкладок.
 */
export function AppLayout({ role, children, narrow, chat }: { role: Role; children: ReactNode; narrow?: boolean; chat?: 'list' | 'thread' }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const counters = useCounters(role);
  const nav = NAV[role];
  const top = nav.top.filter((item) => ready(item.to));
  const tabs = nav.tabs.filter((t) => ready(t.to)).map((t) => (t.icon === 'chat' ? { ...t, badge: counters.chats } : t));
  const accountTo = role === 'admin' ? '/admin/disputes' : `${counters.prefix}/account`;
  return (
    <div className={cx('wash trh-page trh-tight trk-app', `tabs-${tabs.length}`, chat && `trk-chat-${chat}`)} style={{ '--n': tabs.length } as CSSProperties}>
      <header className="hdr surf trh-hdr trk-app-hdr">
        <Logo />
        <nav className="trh-nav" aria-label="Разделы кабинета">
          {top.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'cur' : undefined)}>{item.label}</NavLink>)}
        </nav>
        {role === 'admin' && <span className="icons"><Button size="s" variant="fill" onClick={() => { void logout().then(() => navigate('/')); }}>Выйти</Button></span>}
        {role !== 'admin' && (
          <span className="icons">
            {ready(`${counters.prefix}/notifications`) && <IconButton icon="bell" label="Уведомления" to={`${counters.prefix}/notifications`} badge={counters.notifications > 0} className="trk-hdr-ic" />}
            {ready(`${counters.prefix}/chats`) && <IconButton icon="chat" label="Сообщения" to={`${counters.prefix}/chats`} badge={counters.chats || false} className="trk-hdr-ic" />}
            <Link className="trk-ava-link" to={accountTo} aria-label="Профиль"><Avatar name={user?.name ?? '•'} size={44} /></Link>
          </span>
        )}
      </header>
      <main id="main" tabIndex={-1} className={cx('trh-main', narrow && 'trk-narrow')}>{children}</main>
      <nav className={cx('tabbar surf trk-tabbar', tabs.length === 5 && 'five')} aria-label="Разделы">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => cx('tab', isActive && 'cur')}>
            <Icon name={t.icon} />{t.label}{t.badge ? <span className="dot">{t.badge}</span> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
