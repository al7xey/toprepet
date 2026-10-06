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
      <p>Метрика запускается автоматически на публичных страницах. Здесь можно изменить настройку аналитики.</p>
      <div className="cookie-settings-actions">
        <button type="button" className="button button-primary" onClick={() => saveCookieChoice('all')} aria-pressed={choice !== 'necessary'}>Включить аналитику</button>
        <button type="button" className="button button-light" onClick={() => saveCookieChoice('necessary')} aria-pressed={choice === 'necessary'}>Отключить аналитику</button>
      </div>
      <output aria-live="polite">{choice === 'necessary' ? 'Аналитика отключена.' : 'Аналитика включена. Вы можете изменить настройку в любой момент.'}</output>
    </div>
  );
}
