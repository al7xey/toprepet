import { Icon } from './icon';
import { useEffect, useRef } from 'react';
import './scenes.css';

export type SceneKind = 'search' | 'chat' | 'calendar' | 'requests' | 'finance' | 'achievement';

export function Scene({ kind, compact = false }: { kind: SceneKind; compact?: boolean }) {
  const scene = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element || typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    element.dataset.sceneReady = '';
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      element.dataset.sceneVisible = '';
      observer.disconnect();
    }, { threshold: .15 });
    observer.observe(element);
    return () => { observer.disconnect(); delete element.dataset.sceneReady; };
  }, []);
  return <span ref={scene} className={`trk-scene${compact ? ' compact' : ''}`} aria-hidden="true">
    <img src={`/images/scenes/${kind}.webp`} alt="" width={640} height={427} loading="lazy" decoding="async" />
    <svg className="trk-scene-spark" viewBox="0 0 24 24"><path d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10C11 16 8 13 2 12c6-1 9-4 10-10Z" /></svg>
  </span>;
}

export function sceneForIcon(icon: string): SceneKind {
  if (/chat|message|bell/.test(icon)) return 'chat';
  if (/book|cal|clock/.test(icon)) return 'calendar';
  if (/card|wallet|pay/.test(icon)) return 'finance';
  if (/star|school|shield|doc/.test(icon)) return 'achievement';
  if (/search|filter/.test(icon)) return 'search';
  return 'requests';
}

/** Reuse the project's pictograms inside a light hand-drawn frame. */
export function SceneIcon({ name }: { name: string }) {
  return <span className="trk-scene-icon" aria-hidden="true">
    <svg viewBox="0 0 44 44"><path d="M8 6Q22 1 36 8Q42 22 36 36Q22 42 7 35Q1 22 8 6Z" /><path className="accent" d="m33 5 3-3m2 9 4-1" /></svg>
    <Icon name={name} />
  </span>;
}
