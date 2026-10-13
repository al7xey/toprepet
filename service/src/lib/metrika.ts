/* Yandex Metrika goals of the service (iteration 5). They follow the success metric of the brief: bookings made and
   confirmed (≥ 70 % confirmed), lessons that took place, tutors who published their profiles, plus the steps before.
   Everything is a no-op until a counter id is configured (VITE_YM_ID) and while the visitor has turned analytics off
   on the site's «Документы → Cookies» page (the same choice the landing keeps). No names, emails or free text are sent. */

export const GOALS = {
  signup: 'регистрация, параметр role: student или tutor',
  booking_start: '«Записаться» на анкете репетитора',
  booking_created: 'заявка отправлена (запись ждёт подтверждения)',
  booking_confirmed: 'репетитор подтвердил запись',
  booking_declined: 'репетитор отклонил запись',
  tutor_published: 'репетитор опубликовал анкету',
  lesson_ok: 'ученик нажал «Всё прошло хорошо»',
  problem_reported: 'ученик сообщил о проблеме',
} as const;

export type Goal = keyof typeof GOALS;
export type GoalParams = Record<string, string | number | boolean>;

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

/** What the counter needs from the page; a test passes a fake. */
export interface MetrikaHost {
  ym?: Ym;
  document: { head: { append: (el: unknown) => void }; createElement: (tag: string) => { async?: boolean; src?: string } };
  localStorage?: { getItem: (k: string) => string | null };
  location: { origin: string; pathname: string };
}

/** The landing's consent key (src/shared/lib/cookie-consent.ts): an explicit «necessary» means no analytics. */
export const CONSENT_KEY = 'toprepet-cookie-consent-v1';

/** A counter id from the build setting, or null when it is not set or not a number. */
export function counterId(raw: string | undefined | null): number | null {
  const id = Number(raw?.trim());
  return raw && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function optedOut(host: MetrikaHost) {
  try {
    const stored = JSON.parse(host.localStorage?.getItem(CONSENT_KEY) ?? 'null') as { choice?: string } | null;
    return stored?.choice === 'necessary';
  } catch {
    return false;
  }
}

export function createMetrika(id: number | null, getHost: () => MetrikaHost | undefined) {
  let started = false;
  let last = '';

  /** Loads tag.js once and initialises the counter (without Webvisor: cabinets show names and addresses). */
  function start(host: MetrikaHost) {
    if (started || !id) return started;
    if (!host.ym) {
      const queue: Ym = Object.assign((...args: unknown[]) => void queue.a!.push(args), { a: [] as unknown[][], l: Date.now() });
      host.ym = queue;
      const script = host.document.createElement('script');
      script.async = true;
      script.src = `https://mc.yandex.ru/metrika/tag.js?id=${id}`;
      host.document.head.append(script);
    }
    host.ym(id, 'init', { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    started = true;
    return true;
  }

  function ready() {
    const host = getHost();
    if (!id || !host || optedOut(host)) return null;
    return start(host) ? host : null;
  }

  return {
    enabled: () => Boolean(ready()),
    /** A page view of the single-page app: only the path, never the query (search text, filters stay on the site). */
    hit(title?: string) {
      const host = ready();
      if (!host?.ym || !id) return;
      const url = `${host.location.origin}${host.location.pathname}`;
      if (url === last) return;
      host.ym(id, 'hit', url, { title, referer: last || undefined });
      last = url;
    },
    goal(name: Goal, params?: GoalParams) {
      const host = ready();
      if (!host?.ym || !id) return;
      host.ym(id, 'reachGoal', name, params);
    },
  };
}
