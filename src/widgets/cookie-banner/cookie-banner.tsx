import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cookieChoice, saveCookieChoice, COOKIE_CONSENT_EVENT } from '../../shared/lib/cookie-consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    const update = () => setVisible(cookieChoice() === null);
    update();
    window.addEventListener(COOKIE_CONSENT_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(COOKIE_CONSENT_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  if (!visible || pathname.startsWith('/blog/admin')) return null;
  return <aside className="cookie-banner" aria-label="Cookies и аналитика">
    <div><p>Мы используем cookies для работы сайта и, с вашего согласия, для аналитики.</p><Link to="/legal/cookies/">Подробнее о cookies</Link></div>
    <div className="cookie-banner-actions"><button className="button button-primary" onClick={() => saveCookieChoice('all')}>Принять</button><button className="button button-light" onClick={() => saveCookieChoice('necessary')}>Только необходимые</button></div>
  </aside>;
}
