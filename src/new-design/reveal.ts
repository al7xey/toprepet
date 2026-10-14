import { useEffect, type RefObject } from 'react';

/** Атрибуты анимации появления при прокрутке: тип, задержка в секундах и дополнительные стили. */
export const rv = (kind: 'up' | 'scale' | 'left' | 'right' = 'up', delay = 0, style: React.CSSProperties = {}) =>
  ({ 'data-rv': kind, style: { ...style, ...(delay ? { '--d': `${delay}s` } : {}) } as React.CSSProperties }) as const;

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
export function useParallax(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = target.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => { frame = 0; el.style.setProperty('--py', `${Math.min(window.scrollY, 700) * 0.1}px`); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [target]);
}
