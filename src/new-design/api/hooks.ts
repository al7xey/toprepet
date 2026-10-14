import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './contract';

export interface Query<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (update: T | ((prev: T | undefined) => T)) => void;
}

const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.';

/**
 * Загрузка данных с состояниями «загрузка / ошибка / данные».
 * key — строка зависимостей: при её смене запрос повторяется; null — не загружать.
 * initial — данные для первой отрисовки (например, для пререндера).
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, initial?: T): Query<T> {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(key !== null && initial === undefined);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then((value) => { if (alive) setData(value); })
      .catch((reason) => { if (alive) setError(errorText(reason)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [key, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const set = useCallback((update: T | ((prev: T | undefined) => T)) => {
    setData((prev) => (typeof update === 'function' ? (update as (p: T | undefined) => T)(prev) : update));
  }, []);
  return { data, error, loading, reload, setData: set };
}

export interface Mutation<A extends unknown[], R> {
  run: (...args: A) => Promise<R | undefined>;
  pending: boolean;
  error: string | null;
  reset: () => void;
}

/** Действие с сервером: блокирует кнопку на время запроса и отдаёт понятный текст ошибки. */
export function useMutation<A extends unknown[], R>(action: (...args: A) => Promise<R>): Mutation<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionRef = useRef(action);
  actionRef.current = action;
  const run = useCallback(async (...args: A) => {
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (reason) {
      setError(errorText(reason));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);
  return { run, pending, error, reset: () => setError(null) };
}
