import { expect, test } from 'vitest';
import { listReducer, type ListState } from './catalog-list';
import type { Tutor } from '../api/types';

const tutor = { id: 'previous-query' } as Tutor;
const loaded: ListState = { key: 'old-filter', items: [tutor], total: 2, cursor: 'next', more: false, error: null };

test('ошибка другого поиска не возвращает прежние карточки и курсор', () => {
  const failed = listReducer(loaded, { type: 'fail', key: 'new-filter', message: 'Недоступно' });
  expect(failed.items).toEqual([]);
  expect(failed.cursor).toBeNull();
  expect(failed.total).toBeNull();
  expect(failed.error).toBe('Недоступно');
  const recovered = listReducer(failed, { type: 'first', key: 'new-filter', items: [tutor], total: 1, cursor: null });
  expect(recovered.error).toBeNull();
  expect(recovered.items).toHaveLength(1);
});

test('сбой следующей страницы сохраняет уже загруженные результаты', () => {
  const failed = listReducer(listReducer(loaded, { type: 'more-start' }), { type: 'more-fail', message: 'Недоступно' });
  expect(failed.items).toEqual([tutor]);
  expect(failed.cursor).toBe('next');
  expect(failed.more).toBe(false);
});
