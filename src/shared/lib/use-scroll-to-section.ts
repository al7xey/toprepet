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
      if (attempts++ < 120) frame = window.requestAnimationFrame(scroll);
    };

    // Font loading can change line wrapping and the position of later sections.
    void document.fonts.ready.then(() => {
      if (!cancelled) frame = window.requestAnimationFrame(scroll);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [location.key, location.pathname, location.hash, location.state]);
}
