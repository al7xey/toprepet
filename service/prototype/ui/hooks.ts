import { useEffect, useState, useSyncExternalStore } from 'react';
import { now, onClockChange } from '../lib/time';

export function useMedia(query: string) {
  return useSyncExternalStore(
    cb => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePhone = () => useMedia('(max-width: 759px)');
export const useWide = () => useMedia('(min-width: 1000px)');

/* current time, re-rendering every `step` ms and when the developer clock moves */
export function useNow(step = 30_000) {
  const [t, setT] = useState(now);
  useEffect(() => {
    const id = window.setInterval(() => setT(now()), step);
    const off = onClockChange(() => setT(now()));
    return () => {
      window.clearInterval(id);
      off();
    };
  }, [step]);
  return t;
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — TopRepet` : 'TopRepet — подбор репетиторов';
  }, [title]);
}

/* countdown in mm:ss to a timestamp */
export function useCountdown(until: number) {
  const t = useNow(1000);
  const left = Math.max(0, until - t);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, label: `${m}:${String(s).padStart(2, '0')}` };
}
