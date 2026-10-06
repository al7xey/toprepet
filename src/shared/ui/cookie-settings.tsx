import { useEffect, useState } from 'react';
import { cookieChoice, saveCookieChoice, COOKIE_CONSENT_EVENT, type CookieChoice } from '../lib/cookie-consent';

export function CookieSettings() {
  const [choice, setChoice] = useState<CookieChoice | null>(null);
  useEffect(() => {
    const update = () => setChoice(cookieChoice());
    update();
    window.addEventListener(COOKIE_CONSENT_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return (
    <div className="cookie-settings">
      <p>Мы используем cookies для работы сайта и, с вашего согласия, для аналитики.</p>
      <div className="cookie-settings-actions">
        <button type="button" className="button button-primary" onClick={() => saveCookieChoice('all')} aria-pressed={choice === 'all'}>Принять</button>
        <button type="button" className="button button-light" onClick={() => saveCookieChoice('necessary')} aria-pressed={choice === 'necessary'}>Только необходимые</button>
      </div>
      <output aria-live="polite">{choice === 'all' ? 'Аналитика разрешена. Вы можете изменить выбор в любой момент.' : choice === 'necessary' ? 'Используются только необходимые механизмы. Аналитика отключена.' : 'Аналитика не запускается, пока вы её не разрешите.'}</output>
    </div>
  );
}
