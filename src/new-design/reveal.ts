import { useEffect, type RefObject } from 'react';

/** Появление блоков при прокрутке отключено: блоки сразу на месте. Функция оставлена, чтобы не менять разметку страниц. */
export const rv = (_kind: 'up' | 'scale' | 'left' | 'right' = 'up', _delay = 0, style: React.CSSProperties = {}) =>
  ({ style }) as const;

/**
 * Появление блоков при прокрутке: элементы с data-rv плавно выезжают, когда попадают в экран.
 * Следит и за элементами, которые появились позже (переход между страницами, загрузка данных).
 * Без JavaScript и при «уменьшить движение» всё видно сразу.
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.classList.add('in');
          io.unobserve(target);
          // после появления снимаем атрибут, чтобы не мешать наведению и обычным переходам
          window.setTimeout(() => target.removeAttribute('data-rv'), 1700);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    );
    const scan = () => el.querySelectorAll('[data-rv]').forEach((node) => { if (!seen.has(node)) { seen.add(node); io.observe(node); } });
    scan();
    el.classList.add('rv-on');
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); el.classList.remove('rv-on'); };
  }, [root]);
}

/** Лёгкий параллакс: элемент смещается чуть медленнее прокрутки. */
