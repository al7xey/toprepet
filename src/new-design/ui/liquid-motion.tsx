import { useEffect } from 'react';
import './liquid-motion.css';

const CONTROL_SELECTOR = '.tr .btn, .tr .trk-iconbtn, .tr .chipf, .tr .opt';
const PULSE_CLEANUP_MS = 520;

function positionPercent(offset: number, size: number) {
  return `${Math.min(100, Math.max(0, offset / size * 100))}%`;
}

/** Animate a decorative lens, keeping the control and its hit target stationary. */
export function LiquidMotion() {
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const timers = new Map<HTMLElement, number>();
    const pulse = (element: HTMLElement, x: number, y: number) => {
      if (preference.matches || element.matches(':disabled,[aria-disabled=true]')) return;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      element.style.setProperty('--lg-pulse-x', positionPercent(x - box.left, box.width));
      element.style.setProperty('--lg-pulse-y', positionPercent(y - box.top, box.height));
      element.classList.remove('lg-pulse');
      // Resolve the removed animation before adding it again on a repeated press.
      if (timers.has(element)) element.getAnimations();
      element.classList.add('lg-pulse');
      clearTimeout(timers.get(element));
      timers.set(element, window.setTimeout(() => {
        element.classList.remove('lg-pulse');
        timers.delete(element);
      }, PULSE_CLEANUP_MS));
    };
    const control = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(CONTROL_SELECTOR) : null;
    const pointer = (event: PointerEvent) => {
      const element = control(event.target);
      if (element && event.isPrimary && event.button === 0) pulse(element, event.clientX, event.clientY);
    };
    const key = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
      const element = control(event.target);
      if (!element) return;
      const box = element.getBoundingClientRect();
      pulse(element, box.left + box.width / 2, box.top + box.height / 2);
    };
    const clearPulses = () => {
      for (const [element, timer] of timers) {
        clearTimeout(timer);
        element.classList.remove('lg-pulse');
      }
      timers.clear();
    };
    const reduce = () => { if (preference.matches) clearPulses(); };
    document.addEventListener('pointerdown', pointer, { passive: true });
    document.addEventListener('keydown', key);
    preference.addEventListener('change', reduce);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', key);
      preference.removeEventListener('change', reduce);
      clearPulses();
    };
  }, []);
  return null;
}
