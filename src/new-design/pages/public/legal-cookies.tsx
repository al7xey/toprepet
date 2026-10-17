import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_EVENT, cookieChoice, saveCookieChoice, type CookieChoice } from '../../../shared/lib/cookie-consent';
import { Button } from '../../ui';

/** Переключатель аналитики на странице о cookies. */
export function CookieChoiceControls() {
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
  const off = choice === 'necessary';
  return (
    <div className="g10">
      <div className="trk-actions">
        <Button variant={off ? 'line' : 'primary'} onClick={() => saveCookieChoice('all')}>Включить аналитику</Button>
        <Button variant={off ? 'primary' : 'line'} onClick={() => saveCookieChoice('necessary')}>Отключить аналитику</Button>
      </div>
      <output className="muted sm" aria-live="polite">{off ? 'Аналитика отключена.' : 'Аналитика включена.'}</output>
    </div>
  );
}
