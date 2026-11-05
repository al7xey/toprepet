import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './contract';

export interface Query<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  status?: number;
  reload: () => void;
  setData: (update: T | ((prev: T | undefined) => T)) => void;
}

const errorText = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.';

interface Result<T> {
  /** Метка запроса `ключ#повтор`: по ней видно, относится ли результат к текущему запросу. */
  id: string;
  key: string | null;
  status?: number;
  data: T | undefined;
  error: string | null;
}

/**
 * Загрузка данных с состояниями «загрузка / ошибка / данные».
 * key — строка зависимостей: при её смене запрос повторяется; null — не загружать.
 * initial — данные для первой отрисовки (например, для пререндера).
 * Пока идёт новый запрос, прежние данные остаются на экране.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, initial?: T): Query<T> {
  const [tick, setTick] = useState(0);
  const id = key === null ? null : `${key}#${tick}`;
  const [result, setResult] = useState<Result<T>>({ key, id: initial !== undefined && key !== null ? `${key}#0` : '', data: initial, error: null });
  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    fetcherRef.current().then(
      (value) => { if (alive) setResult({ key, id, data: value, error: null }); },
      (reason) => { if (alive) setResult((prev) => ({ key, id, data: prev.key === key ? prev.data : undefined, status: reason instanceof ApiError ? reason.status : undefined, error: errorText(reason) })); },
    );
    return () => { alive = false; };
  }, [id, key]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const setData = useCallback((update: T | ((prev: T | undefined) => T)) => {
    setResult((prev) => ({ ...prev, data: typeof update === 'function' ? (update as (p: T | undefined) => T)(prev.data) : update }));
  }, []);
  const current = id !== null && result.id === id;
  return { data: result.key === key ? result.data : initial, status: current ? result.status : undefined, error: current ? result.error : null, loading: id !== null && !current, reload, setData };
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
  const busy = useRef(false);
  const actionRef = useRef(action);
  useEffect(() => { actionRef.current = action; });
  const run = useCallback(async (...args: A) => {
    if (busy.current) return undefined;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (reason) {
      setError(errorText(reason));
      return undefined;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);
  return { run, pending, error, reset: () => setError(null) };
}
