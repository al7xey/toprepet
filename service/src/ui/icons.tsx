import type { CSSProperties } from 'react';

/* The icon sprite from the TopRepet UI kit, plus a few icons the product screens need. */
export function SpriteDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-logo" viewBox="0 0 36 36"><rect width="36" height="36" rx="11" fill="currentColor" /><path d="M17 9v14a4 4 0 0 0 4 4h3M11 15h13" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></symbol>
        <symbol id="i-person" viewBox="0 0 200 220"><circle cx="100" cy="78" r="44" fill="currentColor" /><path d="M14 220c4-58 40-92 86-92s82 34 86 92z" fill="currentColor" /></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" /></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path style={{ fill: 'var(--heart-fill, none)' }} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.9 4.5 7.1 4.5c2 0 3.4 1.1 4.9 3 1.5-1.9 2.9-3 4.9-3 3.2 0 5.4 3 4.3 6.2C19.5 15.4 12 20 12 20z" /></symbol>
        <symbol id="i-cal" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="4" /><path d="M3.5 10h17M8 3v4M16 3v4" /></g></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g></symbol>
        <symbol id="i-video" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="6.5" width="12.5" height="11" rx="3.5" /><path d="M15.5 10.5l5-3v9l-5-3z" /></g></symbol>
        <symbol id="i-card" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5.5" width="18" height="13" rx="3.5" /><path d="M3 10h18M7 15h4" /></g></symbol>
        <symbol id="i-search" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></g></symbol>
        <symbol id="i-doc" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 12h6M9 16h6" /></g></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M4 6.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z" /></symbol>
        <symbol id="i-wallet" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3.5" y="6.5" width="17" height="13" rx="3.5" /><path d="M16 13h1.5M6 6.5l9-3v3" /></g></symbol>
        <symbol id="i-user" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20c.9-3.7 3.8-5.8 7.5-5.8s6.6 2.1 7.5 5.8" /></g></symbol>
        <symbol id="i-help" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01" /></g></symbol>
        <symbol id="i-eye" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></g></symbol>
        <symbol id="i-eye-off" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l16 16M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 7.6C4 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M10 10.2a3 3 0 0 0 4 4" /></g></symbol>
        <symbol id="i-info" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></g></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" /></symbol>
        <symbol id="i-warn" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.5h.01" /></g></symbol>
        <symbol id="i-plus" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M12 5v14M5 12h14" /></symbol>
        <symbol id="i-minus" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M5 12h14" /></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></symbol>
        <symbol id="i-right" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M9 5.5l6.5 6.5L9 18.5" /></symbol>
        <symbol id="i-left" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M15 5.5L8.5 12l6.5 6.5" /></symbol>
        <symbol id="i-down" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></symbol>
        <symbol id="i-share" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" /><path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" /></g></symbol>
        <symbol id="i-filter" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M4 7h16M7 12h10M10 17h4" /></symbol>
        <symbol id="i-globe" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></g></symbol>
        <symbol id="i-send" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M6 11l6-6 6 6" /></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 3.5l7.5 3v5.5c0 4.5-3.2 7.6-7.5 8.5-4.3-.9-7.5-4-7.5-8.5V6.5z" /></symbol>
        <symbol id="i-inbox" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3.5 13.5l2.5-8h12l2.5 8v5h-17z" /><path d="M3.5 13.5h5l1 2h5l1-2h5" /></g></symbol>
        <symbol id="i-gift" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="9" width="16" height="11" rx="2.5" /><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S12 9 12 9zm0 0c1.5-3.5 5.5-4 5.5-1.5S12 9 12 9z" /></g></symbol>
        <symbol id="i-repeat" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-3-3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l3 3" /></g></symbol>
        <symbol id="i-bell" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></g></symbol>
        <symbol id="i-gear" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" /><circle cx="12" cy="12" r="6.8" /></g></symbol>
        <symbol id="i-logout" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" /><path d="M14.5 8l4 4-4 4M18.5 12H9.5" /></g></symbol>
        <symbol id="i-copy" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6.5a2.5 2.5 0 0 0-2.5-2.5h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></g></symbol>
        <symbol id="i-edit" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></g></symbol>
        <symbol id="i-trash" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></g></symbol>
        <symbol id="i-pause" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M9 6v12M15 6v12" /></symbol>
        <symbol id="i-play" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M8 5.5v13l10.5-6.5z" /></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M3.5 7l8.5 6.5L20.5 7" /></g></symbol>
        <symbol id="i-image" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><circle cx="9" cy="10" r="1.8" /><path d="M20.5 15.5l-5-5L5 19.5" /></g></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></g></symbol>
        <symbol id="i-dots" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></g></symbol>
        <symbol id="i-flag" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" /></g></symbol>
        <symbol id="i-home" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 11l8-6.5 8 6.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5z" /><path d="M9.5 21v-6h5v6" /></g></symbol>
        <symbol id="i-spark" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.5l1.7 5.8 5.8 1.7-5.8 1.7L12 17.5l-1.7-5.8L4.5 10l5.8-1.7z" /></symbol>
        <symbol id="i-signal" viewBox="0 0 18 12"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></g></symbol>
      </defs>
    </svg>
  );
}

export type IconName =
  | 'logo' | 'person' | 'star' | 'heart' | 'cal' | 'clock' | 'video' | 'card' | 'search' | 'doc' | 'chat' | 'wallet' | 'user' | 'help' | 'eye' | 'eye-off'
  | 'info' | 'check' | 'warn' | 'plus' | 'minus' | 'x' | 'right' | 'left' | 'down' | 'share' | 'filter' | 'globe' | 'send' | 'shield' | 'inbox' | 'gift'
  | 'repeat' | 'bell' | 'gear' | 'logout' | 'copy' | 'edit' | 'trash' | 'pause' | 'play' | 'mail' | 'image' | 'lock' | 'dots' | 'flag' | 'home' | 'spark';

export function Icon({ name, className, style, title }: { name: IconName | string; className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg className={className} style={style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <use href={`#i-${name}`} />
    </svg>
  );
}

/* filled heart for saved tutors (the sprite heart is stroke-only) */
export function HeartOn() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.9 4.5 7.1 4.5c2 0 3.4 1.1 4.9 3 1.5-1.9 2.9-3 4.9-3 3.2 0 5.4 3 4.3 6.2C19.5 15.4 12 20 12 20z" />
    </svg>
  );
}
