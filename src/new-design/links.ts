/**
 * Куда ведут ссылки макета, пока готова только главная.
 * Экраны, которых ещё нет (вход, регистрация, заявка), ведут на ближайшую существующую страницу
 * или никуда ('#'); по мере появления страниц адреса меняются только здесь.
 */
export const LINKS = {
  home: '/',
  catalog: '/teachers/',
  request: '/contact/',
  intro: '/free-intro/',
  tutors: '/for-repetitor/',
  help: '/contact/',
  refund: '/legal/payment-refund/',
  blog: '/blog',
  docs: '/legal/',
  login: '#',
  signup: '#',
} as const;
