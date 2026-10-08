import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { syncAnalytics, trackPage, trackGoal } from '../shared/lib/analytics';
import { COOKIE_CONSENT_EVENT } from '../shared/lib/cookie-consent';

export function MetrikaTracker() {
  const { pathname } = useLocation();
  const [consentRevision, setConsentRevision] = useState(0);
  useEffect(() => {
    const update = () => { syncAnalytics(); setConsentRevision(value => value + 1); };
    window.addEventListener(COOKIE_CONSENT_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener(COOKIE_CONSENT_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  // Stop recording before an admin screen is painted, including client-side navigation.
  useLayoutEffect(() => {
    syncAnalytics();
  }, [pathname, consentRevision]);
  useEffect(() => {
    const frame = requestAnimationFrame(trackPage);
    if (!syncAnalytics()) return () => cancelAnimationFrame(frame);
    const viewed = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id =
            entry.target.id ||
            entry.target
              .getAttribute('aria-labelledby')
              ?.replace(/-title$/, '');
          if (
            id &&
            entry.isIntersecting &&
            document.visibilityState === 'visible' &&
            !viewed.has(id)
          ) {
            viewed.add(id);
            trackGoal('section_view', { section: id });
          }
        }
      },
      { threshold: 0.25 },
    );
    const sectionSelector =
      'main section[id], main section[aria-labelledby], #contact, #application';
    const observed = new WeakSet<Element>();
    const observeSection = (section: Element) => {
      if (observed.has(section)) return;
      observed.add(section);
      observer.observe(section);
    };
    document.querySelectorAll(sectionSelector).forEach(observeSection);
    // A lazy route can finish rendering after this effect. Register its
    // sections too so SPA navigation keeps the same Metrika view goals.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(sectionSelector)) observeSection(node);
          node.querySelectorAll(sectionSelector).forEach(observeSection);
        }
      }
    });
    const root = document.getElementById('root');
    if (root) mutations.observe(root, { childList: true, subtree: true });
    let elapsed = 0;
    let last = performance.now();
    let engaged = false;
    let deep = false;
    const tick = () => {
      const now = performance.now();
      if (document.visibilityState === 'visible' && document.hasFocus())
        elapsed += Math.min(now - last, 2000);
      last = now;
      if (!engaged && elapsed >= 60000) {
        engaged = true;
        trackGoal('engaged_60');
      }
    };
    const timer = window.setInterval(tick, 1000);
    const scroll = () => {
      const distance = document.documentElement.scrollHeight - innerHeight;
      if (!deep && distance > innerHeight * 0.5 && scrollY / distance >= 0.75) {
        deep = true;
        trackGoal('scroll_75');
      }
    };
    const click = (event: MouseEvent) => {
      const element =
        event.target instanceof Element
          ? event.target.closest('a,button')
          : null;
      if (!element) return;
      if (
        element.matches('.faq-trigger') &&
        element.getAttribute('aria-expanded') !== 'true'
      ) {
        const questions = Array.from(document.querySelectorAll('.faq-trigger'));
        trackGoal('faq_open', { question: questions.indexOf(element) + 1 });
      }
      if (
        element.matches('.blog-root a') &&
        element instanceof HTMLAnchorElement &&
        /\/(lessons|free-intro)\//.test(element.pathname)
      )
        trackGoal('blog_cta_click');
    };
    document.addEventListener('click', click, true);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
      clearInterval(timer);
      document.removeEventListener('click', click, true);
      window.removeEventListener('scroll', scroll);
    };
  }, [pathname, consentRevision]);
  return null;
}
