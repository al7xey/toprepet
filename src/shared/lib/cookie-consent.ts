export type CookieChoice = 'all' | 'necessary';
export const COOKIE_CONSENT_KEY = 'toprepet-cookie-consent-v1';
export const COOKIE_CONSENT_EVENT = 'toprepet:cookie-consent';
const maxAge = 180 * 24 * 60 * 60 * 1000;
let sessionChoice: CookieChoice | null = null;

export function cookieChoice(): CookieChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || 'null');
    if (stored?.version === 1 && ['all', 'necessary'].includes(stored.choice) &&
      typeof stored.at === 'number' && stored.at <= Date.now() && Date.now() - stored.at < maxAge) return stored.choice;
  } catch { /* Storage may be unavailable; do not infer permission. */ }
  return sessionChoice;
}

export function saveCookieChoice(choice: CookieChoice) {
  sessionChoice = choice;
  try { localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ version: 1, choice, at: Date.now() })); } catch { /* Keep the choice for this session. */ }
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export function clearAnalyticsCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0];
    if (!name.startsWith('_ym_')) continue;
    for (const domain of ['', location.hostname, `.${location.hostname}`, '.toprepet.ru']) {
      document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ''} SameSite=Lax`;
    }
  }
}
