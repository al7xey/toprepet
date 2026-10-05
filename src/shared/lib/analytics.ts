import {
  subjects,
  foundationSubjects,
  goals,
  exams,
} from '../../entities/lesson';
import { teachers } from '../../entities/teacher';
import { cookieChoice, clearAnalyticsCookies } from './cookie-consent';

export const METRIKA_ID = 112922088;
export type AnalyticsGoal =
  | 'contact_student_click'
  | 'contact_tutor_click'
  | 'contact_telegram'
  | 'contact_whatsapp'
  | 'contact_vk'
  | 'contact_max'
  | 'lesson_picker_view'
  | 'lesson_selection'
  | 'lesson_contact_step'
  | 'teachers_catalog_view'
  | 'teacher_profile_view'
  | 'teacher_search'
  | 'teacher_filter'
  | 'faq_open'
  | 'section_view'
  | 'scroll_75'
  | 'engaged_60'
  | 'blog_article_view'
  | 'blog_cta_click'
  | 'promo_check';
type Params = Record<string, string | number | boolean>;
type MetrikaWindow = Window & {
  ym?: ((id: number, method: string, ...args: unknown[]) => void) & {
    a?: unknown[][];
    l?: number;
  };
};
let active = false;
let previousUrl: string | undefined;

export function isPublicAnalyticsPage(hostname: string, pathname: string) {
  return (
    ['toprepet.ru', 'www.toprepet.ru'].includes(hostname) &&
    !/^\/blog\/admin(?:\/|$)/.test(pathname)
  );
}

export function pageKind(pathname: string) {
  if (pathname === '/') return 'home';
  if (/^\/teachers\/.+/.test(pathname)) return 'teacher_profile';
  if (/^\/teachers\/?$/.test(pathname)) return 'teachers';
  if (/^\/lessons\/?$/.test(pathname)) return 'lessons';
  if (/^\/for-repetitor\/?$/.test(pathname)) return 'for_tutors';
  if (pathname.startsWith('/blog/articles/')) return 'blog_article';
  if (/^\/blog(?:\/|$)/.test(pathname)) return 'blog';
  if (/^\/free-intro\/?$/.test(pathname)) return 'free_intro';
  return 'other';
}

// Only catalog values are sent. Search text, messages and arbitrary input stay on the site.
export function safeChoice(value: string) {
  return [
    ...subjects,
    ...foundationSubjects,
    ...exams,
    ...goals.map((item) => item.id),
    ...goals.map((item) => item.label),
    'До школы',
    ...Array.from({ length: 11 }, (_, i) => String(i + 1)),
  ].includes(value)
    ? value
    : 'other';
}

export function analyticsUrl(href: string) {
  const source = new URL(href);
  const clean = new URL(source.pathname, source.origin);
  // Keep attribution; strip arbitrary search, message, email and admin parameters.
  for (const key of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'yclid',
    'gclid',
  ]) {
    const value = source.searchParams.get(key);
    if (
      value &&
      /^[\p{L}\p{N}_. -]{1,120}$/u.test(value) &&
      (key === 'yclid' || key === 'gclid' || !/\d{7,}/.test(value))
    )
      clean.searchParams.set(key, value);
  }
  return clean.href;
}

export function syncAnalytics() {
  const target = window as MetrikaWindow;
  if (cookieChoice() !== 'all' || !isPublicAnalyticsPage(location.hostname, location.pathname)) {
    if (active) target.ym?.(METRIKA_ID, 'destruct');
    // If consent was withdrawn while the vendor script was downloading,
    // discard its queued init/events so they cannot run after withdrawal.
    if (target.ym?.a) {
      target.ym.a.length = 0;
      document.querySelector('script[data-toprepet-analytics]')?.remove();
      delete target.ym;
    }
    active = false;
    previousUrl = undefined;
    if (cookieChoice() !== 'all') clearAnalyticsCookies();
    return false;
  }
  if (!target.ym) {
    const queue = Object.assign(
      (...args: unknown[]) => {
        queue.a.push(args);
      },
      { a: [] as unknown[][], l: Date.now() },
    );
    target.ym = queue;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.toprepetAnalytics = '';
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
    document.head.append(script);
  }
  if (!active) {
    target.ym(METRIKA_ID, 'init', {
      defer: true,
      webvisor: true,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      ecommerce: 'dataLayer',
      trackHash: false,
      publisher: 'schema.org',
      url: analyticsUrl(location.href),
      referrer: document.referrer ? analyticsUrl(document.referrer) : '',
    });
    active = true;
  }
  return true;
}

export function trackGoal(goal: AnalyticsGoal, params: Params = {}) {
  if (!active || cookieChoice() !== 'all' || !isPublicAnalyticsPage(location.hostname, location.pathname))
    return;
  (window as MetrikaWindow).ym?.(METRIKA_ID, 'reachGoal', goal, {
    page: pageKind(location.pathname),
    ...params,
  });
}

export function trackPage() {
  if (!syncAnalytics()) return;
  const url = analyticsUrl(location.href);
  if (url === previousUrl) return;
  const heading = document.querySelector('h1')?.textContent?.trim();
  (window as MetrikaWindow).ym?.(METRIKA_ID, 'hit', url, {
    referer:
      previousUrl ?? (document.referrer ? analyticsUrl(document.referrer) : ''),
    title: heading ? `${heading} — TopRepet` : document.title,
    params: { page: pageKind(location.pathname) },
  });
  previousUrl = url;
  const kind = pageKind(location.pathname);
  if (kind === 'lessons') trackGoal('lesson_picker_view');
  if (kind === 'teachers') trackGoal('teachers_catalog_view');
  if (kind === 'teacher_profile') {
    const teacher = teachers.find(
      (item) =>
        location.pathname === `/teachers/${item.id}/` ||
        location.pathname === `/teachers/${item.id}`,
    );
    if (teacher) trackGoal('teacher_profile_view', { teacher: teacher.id });
  }
  if (kind === 'blog_article') trackGoal('blog_article_view');
}

export function trackMessenger(
  messenger: 'telegram' | 'whatsapp' | 'vk' | 'max',
) {
  const teacher = teachers.find(
    (item) => location.pathname.replace(/\/$/, '') === `/teachers/${item.id}`,
  );
  const params = { messenger, ...(teacher ? { teacher: teacher.id } : {}) };
  trackGoal(
    location.pathname.startsWith('/for-repetitor')
      ? 'contact_tutor_click'
      : 'contact_student_click',
    params,
  );
  trackGoal(`contact_${messenger}`, params);
}
