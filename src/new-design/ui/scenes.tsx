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
    <Icon name="star" className="trk-scene-spark" />
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

/** The approved illustration already has its own silhouette; no extra frame. */
export function SceneIcon({ name }: { name: string }) {
  return <span className="trk-scene-icon" aria-hidden="true">
    <Icon name={name} />
  </span>;
}
