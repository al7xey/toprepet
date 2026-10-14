/**
 * Куда ведут ссылки макета, пока готова только главная.
 * Экраны, которых ещё нет (вход, регистрация, заявка), ведут на ближайшую существующую страницу
 * или никуда ('#'); по мере появления страниц адреса меняются только здесь.
 */
export const LINKS = {
  home: '/',
  catalog: '/teachers/',
  request: '/screens/rq1',
  intro: '/screens/intro',
  tutors: '/for-repetitor/',
  help: '/screens/help',
  refund: '/legal/payment-refund/',
  blog: '/blog',
  docs: '/legal/',
  login: '/screens/login',
  signup: '/screens/role',
} as const;
