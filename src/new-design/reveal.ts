import { useEffect, type RefObject } from 'react';

/** Motion is progressive enhancement: SSR, reduced motion and unsupported browsers stay visible. */
export const rv = (kind: 'up' | 'scale' | 'left' | 'right' = 'up', delay = 0, style: React.CSSProperties = {}) =>
  ({ 'data-rv': kind, 'data-rv-delay': Math.min(0.24, Math.max(0, delay)), style }) as const;

export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const host = root.current;
    if (!host || typeof IntersectionObserver === 'undefined' || !host.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const seen = new WeakSet<Element>();
    const snapshot = new WeakSet<Element>();
    const observed = new Set<HTMLElement>();
    const active = new Map<HTMLElement, Animation>();
    const play = (node: HTMLElement, kind: string, delay: number) => {
      if (preference.matches || node.contains(document.activeElement)) return;
      const base = getComputedStyle(node).transform;
      const offset = kind === 'left' ? 'translateX(-16px)' : kind === 'right' ? 'translateX(16px)' : kind === 'scale' ? 'translateY(12px) scale(.985)' : 'translateY(14px)';
      const interactive = Boolean(node.querySelector('a,button,input,select,textarea,summary,[tabindex]'));
      const animation = node.animate([
        { opacity: 0, transform: interactive ? base : `${offset} ${base === 'none' ? '' : base}` },
        { opacity: 1, transform: base },
      ], { duration: 420, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      active.set(node, animation);
      void animation.finished.catch(() => {}).finally(() => { if (active.get(node) === animation) active.delete(node); });
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const alreadyPainted = snapshot.delete(entry.target);
        if (!entry.isIntersecting) continue;
        const node = entry.target as HTMLElement;
        observer.unobserve(node); observed.delete(node);
        if (!node.isConnected || preference.matches) continue;
        seen.add(node);
        // The visible server-rendered first screen stays stable during hydration.
        if (alreadyPainted) continue;
        if (node.dataset.rv === 'seq') {
          [...node.children].forEach((child, index) => { if (child instanceof HTMLElement) play(child, 'up', Math.min(index * 60, 240)); });
        } else play(node, node.dataset.rv || 'up', Math.min(Number(node.dataset.rvDelay) || 0, 0.24) * 1000);
      }
    }, { threshold: 0.05 });
    const scan = (node: Element, initial = false) => {
      if (preference.matches) return;
      const candidates = [...(node.matches('[data-rv]') ? [node] : []), ...node.querySelectorAll('[data-rv]')];
      for (const candidate of candidates) if (candidate instanceof HTMLElement && !seen.has(candidate) && !observed.has(candidate)) {
        if (initial) snapshot.add(candidate);
        observed.add(candidate); observer.observe(candidate);
      }
    };
    const cancel = () => { for (const animation of active.values()) animation.cancel(); active.clear(); };
    const changePreference = () => {
      if (preference.matches) { observer.disconnect(); observed.clear(); cancel(); }
      else scan(host);
    };
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof Node)) return;
      for (const [node, animation] of active) if (node.contains(event.target)) { animation.cancel(); active.delete(node); }
    };
    const mutation = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node instanceof Element) scan(node);
      for (const node of observed) if (!node.isConnected) { observer.unobserve(node); observed.delete(node); }
      for (const [node, animation] of active) if (!node.isConnected) { animation.cancel(); active.delete(node); }
    });
    scan(host, Boolean(host.closest('#root[data-prerendered]')));
    mutation.observe(host, { childList: true, subtree: true });
    preference.addEventListener('change', changePreference);
    host.addEventListener('focusin', focus);
    return () => {
      observer.disconnect(); mutation.disconnect(); cancel();
      preference.removeEventListener('change', changePreference);
      host.removeEventListener('focusin', focus);
    };
  }, [root]);
}
