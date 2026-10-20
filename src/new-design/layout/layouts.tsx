import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useQuery } from '../api/hooks';
import { homeFor, useSession } from '../api/session';
import type { Role } from '../api/types';
import { Avatar, Button, Icon, IconButton } from '../ui';

const cx = (...p: (string | false | undefined)[]) => p.filter(Boolean).join(' ');

const DRAG_PX = 6; // на сколько сдвинуть палец, чтобы нажатие стало перетаскиванием
const MOVE_MS = 480; // дольше всего пилюля переезжает к новому пункту

/** Где пилюля стояла в последний раз: страницы собирают панель заново, а пилюля должна ехать от старого места, а не появляться на новом. */
let lastPillLeft: number | null = null;

/** Положение и ширина каждого пункта относительно внутреннего края панели. Берём из вёрстки, поэтому слева и справа всё симметрично. */
function cellsOf(host: HTMLElement) {
  const box = host.getBoundingClientRect();
  const scale = box.width / host.offsetWidth || 1; // панель на миг увеличивается под пальцем: возвращаем мерки к исходным
  const origin = box.left + host.clientLeft * scale;
  return Array.from(host.querySelectorAll<HTMLElement>('a.tab'), (tab) => {
    const r = tab.getBoundingClientRect();
    return { left: (r.left - origin) / scale, width: r.width / scale };
  });
}

/**
 * Нижняя панель «жидкое стекло». Прозрачная пилюля выбранного раздела переезжает к новому пункту,
 * на ходу растягиваясь, как капля. Под пальцем она увеличивается и идёт за ним влево и вправо:
 * пока палец на панели, страница не меняется и ничего не пересобирается, раздел открывается при отпускании.
 */
function TabBar({ tabs }: { tabs: NavItem[] }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const bar = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const gesture = useRef<{ x: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const placed = useRef(false);
  const [width, setWidth] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null); // пункт под пальцем: подсвечивает значок
  const [pending, setPending] = useState<{ index: number; at: string } | null>(null); // куда едем, пока адрес ещё не сменился
  const current = tabs.findIndex((t) => [t.to, ...(t.also ?? [])].some((to) => pathname === to || pathname.startsWith(`${to}/`)));
  // после отпускания пилюля сразу едет к выбранному пункту, а не возвращается назад в ожидании смены адреса
  const target = pending && pending.at === pathname ? pending.index : current;
  const shown = dragIndex ?? target;

  // палец в долях пункта: 0 — первый пункт, n−1 — последний
  const posAt = (clientX: number) => {
    const el = bar.current;
    if (!el) return Math.max(target, 0);
    const cells = cellsOf(el);
    if (cells.length < 2) return 0;
    const box = el.getBoundingClientRect();
    const scale = box.width / el.offsetWidth || 1;
    const x = (clientX - box.left) / scale - el.clientLeft;
    const step = cells[1].left - cells[0].left;
    return Math.min(Math.max((x - cells[0].left - cells[0].width / 2) / step, 0), cells.length - 1);
  };
  const leftOf = (cells: { left: number }[], pos: number) => cells[0].left + pos * (cells.length > 1 ? cells[1].left - cells[0].left : 0);

  // пилюля плавно едет к краю dest; в середине пути растянута от старого места до нового и не выходит за панель
  const glide = (dest: number, w: number, from?: number) => {
    const el = pill.current;
    if (!el) return;
    const live = from ?? (placed.current ? parseFloat(getComputedStyle(el).left) : (lastPillLeft ?? Number.NaN));
    el.getAnimations().forEach((a) => a.cancel());
    el.style.width = `${w}px`;
    el.style.left = `${dest}px`;
    placed.current = true;
    lastPillLeft = dest;
    if (Number.isNaN(live) || Math.abs(live - dest) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dist = Math.abs(dest - live);
    const anim = el.animate(
      [{ left: `${live}px`, width: `${w}px` }, { left: `${Math.min(live, dest)}px`, width: `${w + dist * 0.9}px`, offset: 0.5 }, { left: `${dest}px`, width: `${w}px` }],
      { duration: Math.round(Math.min(MOVE_MS, 260 + dist * 1.1)), easing: 'cubic-bezier(.32,.72,0,1)' },
    );
    // пока пилюля едет, запоминаем, где она сейчас: если страница пересоберёт панель, новая пилюля продолжит путь с этого места
    lastPillLeft = live;
    const sample = () => {
      if (!el.isConnected) return;
      const now = parseFloat(getComputedStyle(el).left);
      if (!Number.isNaN(now)) lastPillLeft = now;
      if (anim.playState === 'running') requestAnimationFrame(sample);
      else lastPillLeft = dest;
    };
    requestAnimationFrame(sample);
  };
  // пилюля идёт за пальцем без анимации и без перерисовки страницы
  const follow = (pos: number) => {
    const el = pill.current;
    const host = bar.current;
    if (!el || !host) return;
    const cells = cellsOf(host);
    if (!cells.length) return;
    el.getAnimations().forEach((a) => a.cancel());
    const left = leftOf(cells, pos);
    el.style.width = `${cells[0].width}px`;
    el.style.left = `${left}px`;
    lastPillLeft = left;
  };

  const finish = () => { gesture.current = null; setDragIndex(null); };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesture.current = { x: e.clientX, moved: false };
    bar.current?.setPointerCapture(e.pointerId);
    // под пальцем пилюля сразу увеличивается и плавно подъезжает к нажатому пункту
    const index = Math.round(posAt(e.clientX));
    setDragIndex(index);
    const host = bar.current;
    if (host && index !== target) {
      const cells = cellsOf(host);
      if (cells.length) glide(leftOf(cells, index), cells[0].width);
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.moved && Math.abs(e.clientX - g.x) > DRAG_PX) g.moved = true;
    if (!g.moved) return;
    const pos = posAt(e.clientX);
    follow(pos);
    const index = Math.round(pos);
    setDragIndex((prev) => (prev === index ? prev : index));
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!gesture.current) return;
    const index = Math.round(posAt(e.clientX));
    const to = tabs[index];
    finish();
    // и нажатие, и перетаскивание открывают раздел здесь; обычный клик по ссылке после этого не нужен
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
    if (to && index !== target) { setPending({ index, at: pathname }); void navigate(to.to); return; }
    // отпустили на прежнем пункте: пилюля плавно возвращается на место
    const host = bar.current;
    if (host) { const cells = cellsOf(host); if (cells.length) glide(leftOf(cells, target), cells[0].width); }
  };
  // обработчики вешаем на элемент в эффекте: nav сам по себе не интерактивен
  useEffect(() => {
    const el = bar.current;
    if (!el) return undefined;
    const onContext = (e: Event) => e.preventDefault();
    const onClick = (e: Event) => { if (swallowClick.current) e.preventDefault(); };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', finish);
    el.addEventListener('contextmenu', onContext);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', finish);
      el.removeEventListener('contextmenu', onContext);
      el.removeEventListener('click', onClick, true);
    };
  });
  // ширина панели меняется при повороте телефона
  useEffect(() => {
    const el = bar.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // в покое пилюля стоит на выбранном пункте; пока палец на панели, её ведёт жест
  useLayoutEffect(() => {
    const host = bar.current;
    if (!host || target < 0 || gesture.current) return;
    const cells = cellsOf(host);
    if (cells.length) glide(leftOf(cells, target), cells[0].width);
  }, [target, width, tabs.length]);

  return (
    <nav ref={bar} className={cx('tabbar trk-tabbar', tabs.length === 5 && 'five', dragIndex !== null && 'press')} aria-label="Разделы" style={{ '--n': tabs.length } as CSSProperties}>
      {target >= 0 && <span ref={pill} className="tabpill" aria-hidden="true" />}
      {tabs.map((t, i) => (
        <NavLink key={t.to} to={t.to} draggable={false} className={cx('tab', i === shown && 'cur')}>
          <Icon name={t.icon} /><span className="trk-sr">{t.label}{t.badge ? ', есть новые' : ''}</span>{t.badge ? <span className="dot" aria-hidden="true" /> : null}
        </NavLink>
      ))}
    </nav>
  );
}

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
    return <Button to={homeFor(user.role)} size={block ? 'lg' : 's'} block={block} icon="user">{user.role === 'admin' ? 'Админка' : 'Кабинет'}</Button>;
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

interface NavItem { label: string; to: string; icon: string; badge?: number; /** Другие адреса, которые подсвечивают этот пункт. */ also?: string[] }

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
    tabs: [{ label: 'Поиск', to: '/teachers', icon: 'search' }, { label: 'Занятия', to: '/me/lessons', icon: 'book' }, { label: 'Чаты', to: '/me/chats', icon: 'chat-bubble' }, { label: 'Профиль', to: '/me/account', icon: 'user', also: ['/me/requests', '/me/payments', '/me/notifications'] }],
  },
  tutor: {
    top: [{ label: 'Уроки', to: '/tutor/lessons', icon: 'cal' }, { label: 'Расписание', to: '/tutor/schedule', icon: 'clock' }, { label: 'Ученики', to: '/tutor/students', icon: 'person-plus' }, { label: 'Заявки', to: '/tutor/requests', icon: 'list' }, { label: 'Финансы', to: '/tutor/finance', icon: 'wallet' }, { label: 'Отзывы', to: '/tutor/reviews', icon: 'star' }, { label: 'Анкета', to: '/tutor/profile', icon: 'user' }],
    tabs: [{ label: 'Заявки', to: '/tutor/requests', icon: 'circle-check' }, { label: 'Занятия', to: '/tutor/lessons', icon: 'book', also: ['/tutor/schedule'] }, { label: 'Чаты', to: '/tutor/chats', icon: 'chat-bubble' }, { label: 'Профиль', to: '/tutor/account', icon: 'user', also: ['/tutor/profile', '/tutor/finance', '/tutor/students', '/tutor/reviews', '/tutor/notifications'] }],
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
  const tabs = nav.tabs.filter((t) => ready(t.to)).map((t) => (t.icon === 'chat-bubble' ? { ...t, badge: counters.chats } : t));
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
            {ready(`${counters.prefix}/notifications`) && <IconButton icon="bell" label="Уведомления" to={`${counters.prefix}/notifications`} badge={counters.notifications} className="trk-hdr-ic" />}
            {ready(`${counters.prefix}/chats`) && <IconButton icon="chat" label="Сообщения" to={`${counters.prefix}/chats`} badge={counters.chats || false} className="trk-hdr-ic" />}
            <Link className="trk-ava-link" to={accountTo} aria-label="Профиль"><Avatar name={user?.name ?? '•'} size={44} /></Link>
          </span>
        )}
      </header>
      <main id="main" tabIndex={-1} className={cx('trh-main', narrow && 'trk-narrow')}>{children}</main>
      <TabBar tabs={tabs} />
    </div>
  );
}
