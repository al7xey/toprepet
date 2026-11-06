import type { Tutor } from '../api/types';

export const CATALOG_PAGE_SIZE = 8;
export interface ListState { key: string; items: Tutor[]; total: number | null; cursor: string | null; more: boolean; error: string | null }
export type ListAction =
  | { type: 'first'; key: string; items: Tutor[]; total: number; cursor: string | null }
  | { type: 'fail'; key: string; message: string }
  | { type: 'more-start' }
  | { type: 'more'; items: Tutor[]; cursor: string | null }
  | { type: 'more-fail'; message: string };

export function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case 'first': return { key: action.key, items: action.items, total: action.total, cursor: action.cursor, more: false, error: null };
    // Results from another filter must never become actionable after a failed request.
    case 'fail': return { key: action.key, items: [], total: null, cursor: null, more: false, error: action.message };
    case 'more-start': return { ...state, more: true, error: null };
    case 'more': return { ...state, items: [...state.items, ...action.items], cursor: action.cursor, more: false };
    case 'more-fail': return { ...state, more: false, error: action.message };
  }
}
