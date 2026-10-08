import { useSyncExternalStore } from 'react';
import type { Db } from './types';

/* A small persistent store standing in for the server database.
   Every mutation produces a new root object, so React re-renders through useSyncExternalStore. */

const KEY = 'toprepet.service.db.v1';
export const DB_VERSION = 2;

let db: Db | null = null;
const listeners = new Set<() => void>();
let seedFn: (() => Db) | null = null;

export function registerSeed(fn: () => Db) {
  seedFn = fn;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {
    /* corrupted or blocked storage: start from the seed */
  }
  if (!seedFn) throw new Error('Seed is not registered');
  return seedFn();
}

export function getDb(): Db {
  if (!db) {
    db = load();
    persist();
  }
  return db;
}

let saveTimer: number | undefined;
function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.warn('Не удалось сохранить данные', e);
    }
  }, 60);
}

/* Mutate a draft copy of the root; collections must be replaced or pushed into fresh arrays. */
export function mutate<T>(fn: (draft: Db) => T): T {
  const current = getDb();
  const draft: Db = { ...current };
  for (const k of Object.keys(draft) as (keyof Db)[]) {
    const v = draft[k];
    if (Array.isArray(v)) (draft as unknown as Record<string, unknown>)[k] = v.slice();
  }
  const result = fn(draft);
  db = draft;
  persist();
  listeners.forEach(l => l());
  return result;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useDb() {
  return useSyncExternalStore(subscribe, getDb, getDb);
}

export function resetDb() {
  if (!seedFn) return;
  db = seedFn();
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
  listeners.forEach(l => l());
}

/* cross-tab sync: another tab saved the database */
window.addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    db = JSON.parse(e.newValue) as Db;
    listeners.forEach(l => l());
  } catch {
    /* ignore */
  }
});

/* replace one item of a collection immutably */
export function patch<T extends { id: string }>(list: T[], id: string, changes: Partial<T> | ((item: T) => Partial<T>)): T | undefined {
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return undefined;
  const next = { ...list[i], ...(typeof changes === 'function' ? changes(list[i]) : changes) };
  list[i] = next;
  return next;
}
