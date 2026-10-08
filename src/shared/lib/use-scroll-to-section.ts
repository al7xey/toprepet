import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type ScrollLocationState = {
  scrollTo?: string;
};

export function useScrollToSection() {
  const location = useLocation();

  useEffect(() => {
    const sectionId = location.hash.slice(1) ||
      (location.state as ScrollLocationState | null)?.scrollTo;

    let frame = 0;
    let attempts = 0;
    let cancelled = false;
    let fontsReady = false;
    const mutations = sectionId ? new MutationObserver(() => {
      if (!fontsReady || cancelled) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(scroll);
    }) : undefined;
    const scroll = () => {
      if (cancelled) return;
      // The dialog locks scrolling and restores focus while it closes.
      if (document.querySelector('[data-slot="sheet-content"]')) {
        if (attempts++ < 120) frame = window.requestAnimationFrame(scroll);
        return;
      }
      if (!sectionId) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      const section = document.getElementById(sectionId);
      if (section) {
        mutations?.disconnect();
        const headingId = section.getAttribute('aria-labelledby');
        const target = (headingId && document.getElementById(headingId)) || section;
        // offsetTop excludes reveal-animation transforms and section padding.
        let top = 0;
        let element: HTMLElement | null = target;
        while (element) {
          top += element.offsetTop;
          element = element.offsetParent as HTMLElement | null;
        }
        const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
        window.scrollTo({
          top: Math.max(0, top - headerHeight - 24),
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
        return;
      }
      // Wait for a lazy route to insert its target instead of polling every
      // frame and giving up after two seconds on a slow connection.
    };

    const root = document.getElementById('root');
    if (root && mutations) mutations.observe(root, { childList: true, subtree: true });

    // Font loading can change line wrapping and the position of later sections.
    void (sectionId ? document.fonts.ready : Promise.resolve()).then(() => {
      fontsReady = true;
      if (!cancelled) frame = window.requestAnimationFrame(scroll);
    });
    return () => {
      cancelled = true;
      mutations?.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [location.key, location.pathname, location.hash, location.state]);
}
