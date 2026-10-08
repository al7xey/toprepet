import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './icons';
import { Ava, Dropdown, cx } from './kit';
import { usePhone, useWide, useTitle } from './hooks';
import { useApp } from './app-state';
import { useDb, useSession, auth, chat as chatApi, rules, requests as rq } from '../api';
import type { Db, User } from '../api/types';
import { now } from '../lib/time';

/* ---------- navigation model ---------- */
interface NavItem {
  icon: IconName;
  label: string;
  short?: string;
  to: string;
  badge?: number;
  external?: boolean;
}

const BLOG_URL = 'https://toprepet.ru/blog';

function counts(d: Db, me: User | null) {
  if (!me) return { lessons: 0, requests: 0, chats: 0, tutorRq: 0, notices: 0 };
  const at = now();
  const chats = chatApi.unreadTotal(d, me);
  const notices = d.notices.filter(n => n.userId === me.id && !n.read).length;
  if (me.role === 'tutor') {
    const pending = d.lessons.filter(l => l.tutorId === me.id && (l.status === 'pending' || l.reschedule?.status === 'pending' && l.reschedule.by === 'student')).length;
    const t = d.tutors.find(x => x.userId === me.id);
    const tutorRq = t ? d.requests.filter(r => rq.visibleToTutors(r, at) && rq.matches(d, t, r) && !d.responses.some(x => x.requestId === r.id && x.tutorId === me.id)).length : 0;
    return { lessons: pending, requests: 0, chats, tutorRq, notices };
  }
  const lessons = d.lessons.filter(l => l.studentId === me.id && (rules.phase(l) === 'awaiting' || l.status === 'unpaid' || (l.reschedule?.status === 'pending' && l.reschedule.by === 'tutor'))).length;
  const requests = d.responses.filter(r => r.status === 'sent' && d.requests.find(x => x.id === r.requestId)?.studentId === me.id).length;
  return { lessons, requests, chats, tutorRq: 0, notices };
}

export function navFor(d: Db, me: User | null): { header: NavItem[]; side: NavItem[]; tabs: NavItem[] } {
  const c = counts(d, me);
  if (!me) {
    const header: NavItem[] = [
      { icon: 'home', label: 'Подобрать репетитора', to: '/' },
      { icon: 'search', label: 'Репетиторы', to: '/teachers' },
      { icon: 'doc', label: 'Заявки учеников', to: '/requests' },
      { icon: 'user', label: 'Для репетиторов', to: '/signup/tutor' },
      { icon: 'doc', label: 'Блог', to: BLOG_URL, external: true },
    ];
    return { header, side: [], tabs: [] };
  }
  if (me.role === 'tutor') {
    const side: NavItem[] = [
      { icon: 'cal', label: 'Уроки', to: '/tutor/lessons', badge: c.lessons },
      { icon: 'doc', label: 'Заявки', to: '/tutor/requests', badge: c.tutorRq },
      { icon: 'chat', label: 'Сообщения', short: 'Чаты', to: '/messages', badge: c.chats },
      { icon: 'wallet', label: 'Финансы', to: '/tutor/finance' },
      { icon: 'user', label: 'Анкета', to: '/tutor/profile' },
      { icon: 'star', label: 'Отзывы', to: '/tutor/reviews' },
      { icon: 'inbox', label: 'Ученики', to: '/tutor/students' },
      { icon: 'help', label: 'Помощь', to: '/help' },
    ];
    return { header: side.slice(0, 5), side, tabs: side.slice(0, 5) };
  }
  if (me.role === 'admin') {
    const d0 = d;
    const side: NavItem[] = [
      { icon: 'help', label: 'Споры', to: '/admin/disputes', badge: d0.disputes.filter(x => x.status === 'open').length },
      { icon: 'star', label: 'Отзывы', to: '/admin/reviews', badge: d0.reviews.filter(r => r.status === 'review' || r.complaint?.status === 'open').length },
      { icon: 'shield', label: 'Документы', to: '/admin/documents', badge: d0.tutors.reduce((s, t) => s + t.docs.filter(x => x.status === 'review').length, 0) },
      { icon: 'x', label: 'Отмены', to: '/admin/cancellations' },
      { icon: 'flag', label: 'Жалобы', to: '/admin/complaints', badge: d0.complaints.filter(x => x.status === 'open').length },
      { icon: 'chat', label: 'Поддержка', to: '/admin/support', badge: c.chats },
    ];
    return { header: side, side, tabs: side.slice(0, 5) };
  }
  const side: NavItem[] = [
    { icon: 'search', label: 'Найти репетитора', short: 'Найти', to: '/teachers' },
    { icon: 'cal', label: 'Мои уроки', short: 'Уроки', to: '/my/lessons', badge: c.lessons },
    { icon: 'doc', label: 'Мои заявки', short: 'Заявки', to: '/my/requests', badge: c.requests },
    { icon: 'heart', label: 'Избранное', to: '/me/favorites' },
    { icon: 'user', label: 'Мои репетиторы', to: '/account/tutors' },
    { icon: 'chat', label: 'Сообщения', short: 'Чаты', to: '/messages', badge: c.chats },
    { icon: 'card', label: 'Платежи', to: '/account/payments' },
    { icon: 'help', label: 'Помощь', to: '/help' },
  ];
  const tabs: NavItem[] = [side[0], side[1], side[2], side[5], { icon: 'user', label: 'Профиль', to: '/account' }];
  return { header: [side[0], side[1], side[2], side[6]], side, tabs };
}

/* ---------- header ---------- */
export function SiteHeader() {
  const d = useDb();
  const me = useSession();
  const { askLogin } = useApp();
  const nav = navFor(d, me);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const c = counts(d, me);
  const home = me?.role === 'tutor' ? '/tutor/lessons' : me?.role === 'admin' ? '/admin/disputes' : '/';
  return (
    <div className="site-top">
      <div className="nv-header glass">
        <Link className="nv-logo" to={home}><Icon name="logo" />toprepet</Link>
        {me?.role === 'admin' && <span className="st st--neutral">Админка</span>}
        <nav aria-label="Сайт">
          {nav.header.map(i => (i.external
            ? <a key={i.to} href={i.to}>{i.label}</a>
            : <NavLink key={i.to} to={i.to} end={i.to === '/'}>{i.label}</NavLink>))}
        </nav>
        {!me ? (
          <button className="nv-btn" type="button" onClick={() => askLogin()}>Войти</button>
        ) : (
          <div className="hdr-right">
            <Link className="ibtn r6-hb" to="/notifications" aria-label={c.notices ? `Уведомления: ${c.notices} новых` : 'Уведомления'}><Icon name="bell" />{c.notices ? <span className="nv-badge">{c.notices}</span> : null}</Link>
            {me.role !== 'admin' && <Link className="ibtn r6-hb" to="/messages" aria-label={c.chats ? `Сообщения: ${c.chats} новых` : 'Сообщения'}><Icon name="chat" />{c.chats ? <span className="nv-badge">{c.chats}</span> : null}</Link>}
            <div className="filter">
              <button type="button" className="ava-btn" data-dd-anchor aria-label="Меню профиля" aria-expanded={menu} onClick={() => setMenu(m => !m)}>
                <Ava tone={me.tone} src={me.photo} />
              </button>
              <Dropdown open={menu} onClose={() => setMenu(false)} align="right" style={{ top: 'calc(100% + 10px)' }}>
                <div className="menu-head"><b>{me.name}</b><span>{me.email}</span></div>
                <button type="button" onClick={() => { setMenu(false); navigate(me.role === 'tutor' ? '/tutor/profile' : me.role === 'admin' ? '/admin/disputes' : '/account'); }}>{me.role === 'tutor' ? 'Анкета' : me.role === 'admin' ? 'Админка' : 'Профиль'}</button>
                <button type="button" onClick={() => { setMenu(false); navigate('/account/settings'); }}>Настройки</button>
                <button type="button" onClick={() => { setMenu(false); navigate('/mail'); }}>Почта (демо)</button>
                <button type="button" onClick={() => { setMenu(false); auth.logout(); navigate('/'); }}>Выйти</button>
              </Dropdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SideNav({ current }: { current?: string }) {
  const d = useDb();
  const me = useSession();
  const location = useLocation();
  const nav = navFor(d, me);
  return (
    <nav className="nv-side" aria-label="Кабинет">
      {nav.side.map(i => {
        const active = current ? current === i.label : location.pathname.startsWith(i.to);
        return (
          <Link key={i.to} to={i.to} aria-current={active ? 'page' : undefined}>
            <Icon name={i.icon} />{i.label}{i.badge ? <span className="nv-badge">{i.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBar({ current }: { current?: string }) {
  const d = useDb();
  const me = useSession();
  const location = useLocation();
  if (!me) return null;
  const tabs = navFor(d, me).tabs;
  return (
    <div className="float-bottom tabbar-fixed">
      <nav className="nv-tabs glass" aria-label="Разделы" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(i => {
          const active = current ? current === (i.short ?? i.label) || current === i.label : location.pathname === i.to || (i.to !== '/account' && location.pathname.startsWith(i.to));
          return (
            <Link key={i.to} to={i.to} aria-current={active ? 'page' : undefined}>
              <Icon name={i.icon} />{i.short ?? i.label}{i.badge ? <span className="nv-badge">{i.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppBar({ title, back, right, onBack }: { title?: ReactNode; back?: string | true; right?: ReactNode; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="appbar">
      {back || onBack ? (
        <button className="ibtn" type="button" aria-label="Назад" onClick={() => (onBack ? onBack() : back === true ? navigate(-1) : navigate(back as string))}><Icon name="left" /></button>
      ) : <span className="sp" />}
      <span className="ttl">{title}</span>
      {right ?? <span className="sp" />}
    </div>
  );
}

/* guest top line on phones */
export function PhoneTop() {
  const me = useSession();
  const { askLogin } = useApp();
  return (
    <div className="between phone-top">
      <Link className="nv-logo" to="/"><Icon name="logo" />toprepet</Link>
      {!me ? <button className="btn btn--s btn--white" type="button" onClick={() => askLogin()}>Войти</button> : <Link to={me.role === 'tutor' ? '/tutor/profile' : '/account'} aria-label="Профиль"><Ava tone={me.tone} src={me.photo} /></Link>}
    </div>
  );
}

interface PageProps {
  title: string; // document title and the phone app bar title
  kind?: 'site' | 'cabinet' | 'bare';
  side?: string; // current item of the cabinet menu
  tab?: string; // current tab on phones
  back?: string | true; // phone back button target
  mTitle?: ReactNode;
  right?: ReactNode;
  phoneTop?: boolean;
  bottom?: ReactNode; // floating bar on phones
  hideTabs?: boolean;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}

export function Page({ title, kind = 'site', side, tab, back, mTitle, right, bottom, hideTabs, children, wide, className }: PageProps) {
  useTitle(title);
  const phone = usePhone();
  const wideScreen = useWide();
  const me = useSession();
  const showTabs = phone && !!me && !back && !hideTabs && !bottom;
  return (
    <div className={cx('page', phone && 'is-phone', showTabs && 'has-tabs', !!bottom && phone && 'has-bottom', className)}>
      {kind !== 'bare' && (!phone || !back) && <SiteHeader />}
      {phone && back && <AppBar title={mTitle ?? title} back={back} right={right} />}
      {kind === 'cabinet' && !phone ? (
        <div className={cx('cab-d', !wideScreen && 'cab-narrow')}>
          {wideScreen && <SideNav current={side} />}
          <main id="main" tabIndex={-1}>{children}</main>
        </div>
      ) : (
        <main id="main" tabIndex={-1} className={cx(phone ? 'pg' : 'desk-in', wide && 'desk-wide')} style={phone && !back ? { paddingTop: 16 } : undefined}>
          {children}
        </main>
      )}
      {phone && bottom && <div className="float-bottom bottom-fixed">{bottom}</div>}
      {showTabs && <TabBar current={tab} />}
    </div>
  );
}

/* sticky action bar for phones */
export function ActionBar({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return <div className="actionbar glass">{meta && <div className="meta">{meta}</div>}{children}</div>;
}
