import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type ScrollLocationState = {
  scrollTo?: string;
};

export function useScrollToSection() {
  const location = useLocation();

  useEffect(() => {
    const sectionId = (location.state as ScrollLocationState | null)?.scrollTo;
    if (!sectionId) return;

    let frame = 0;
    let attempts = 0;
    const scroll = () => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (attempts++ < 30) frame = window.requestAnimationFrame(scroll);
    };

    frame = window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(frame);
  }, [location.key, location.state]);
}
