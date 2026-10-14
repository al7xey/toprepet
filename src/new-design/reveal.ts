import { useEffect, type RefObject } from 'react';

/** Атрибуты анимации появления при прокрутке: тип и задержка в секундах. */
export const rv = (kind: 'up' | 'scale' | 'left' | 'right' = 'up', delay = 0, style: React.CSSProperties = {}) =>
  ({ 'data-rv': kind, style: { ...style, ...(delay ? { '--d': `${delay}s` } : {}) } as React.CSSProperties }) as const;

/**
 * Включает появление блоков при прокрутке: элементы с data-rv плавно выезжают, когда попадают в экран.
 * Без JavaScript и при «уменьшить движение» всё видно сразу (страница остаётся читаемой для поиска).
 */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.add('rv-on');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.classList.add('in');
          observer.unobserve(target);
          // после появления снимаем атрибут, чтобы не мешать наведению и обычным переходам
          window.setTimeout(() => target.removeAttribute('data-rv'), 1600);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    el.querySelectorAll('[data-rv]').forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      el.classList.remove('rv-on');
    };
  }, [root]);
}
