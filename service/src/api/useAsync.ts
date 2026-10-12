import { useEffect, useRef, useState } from 'react';

/** Loads data for a page; a new `key` loads again, `reload` repeats the request after an error. */
export function useAsync<T>(load: () => Promise<T>, key: string) {
  const loader = useRef(load);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data: T | null; error: unknown; for: string }>({ data: null, error: null, for: '' });
  const current = `${key}#${attempt}`;

  useEffect(() => {
    loader.current = load;
  });

  useEffect(() => {
    let alive = true;
    const tag = `${key}#${attempt}`;
    loader.current().then(
      data => alive && setState({ data, error: null, for: tag }),
      (error: unknown) => alive && setState({ data: null, error, for: tag }),
    );
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  const loading = state.for !== current;
  return { data: loading ? null : state.data, error: loading ? null : state.error, loading, reload: () => setAttempt(a => a + 1) };
}
