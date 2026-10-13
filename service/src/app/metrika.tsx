import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { counterId, createMetrika, type MetrikaHost } from '../lib/metrika';

/* The service counter: VITE_YM_ID at build time (on one domain with the landing, the same counter 112922088). */
const metrika = createMetrika(counterId(import.meta.env.VITE_YM_ID), () =>
  typeof window === 'undefined' ? undefined : (window as unknown as MetrikaHost),
);

export const reachGoal: typeof metrika.goal = (name, params) => metrika.goal(name, params);

/** Sends a page view on every route change once the counter is on. */
export function MetrikaHits() {
  const { pathname } = useLocation();
  useEffect(() => {
    // after the page has set its title
    const t = window.setTimeout(() => metrika.hit(document.title), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);
  return null;
}
