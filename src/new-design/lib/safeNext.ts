/**
 * Куда вернуть пользователя после входа. Допускаем только внутренние адреса сайта:
 * иначе параметр ?next= можно использовать для перенаправления на чужой сайт.
 */
export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/^\/(login|signup|reset-password|verify-email)(\/|\?|$)/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://toprepet.invalid');
    if (url.origin !== 'https://toprepet.invalid') return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
