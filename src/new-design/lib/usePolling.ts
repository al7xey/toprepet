import { useEffect, useRef } from 'react';

/** Poll only while visible. Resume immediately after returning to the tab. */
export function usePolling(reload: () => void, interval: number) {
  const action = useRef(reload);
  useEffect(() => { action.current = reload; });
  useEffect(() => {
    let timer: number | undefined;
    const update = () => {
      window.clearInterval(timer);
      if (document.visibilityState === 'visible') {
        action.current();
        timer = window.setInterval(() => action.current(), interval);
      }
    };
    if (document.visibilityState === 'visible') timer = window.setInterval(() => action.current(), interval);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, [interval]);
}
