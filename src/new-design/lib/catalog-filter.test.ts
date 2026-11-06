import { expect, it } from 'vitest';
import { readCatalogFilter, writeCatalogFilter } from './catalog-filter';
it('round trips catalogue filters and retains campaign parameters', () => {
  const filter = { query: 'Анна', subject: 'Русский язык', priceMin: 0, priceMax: 2000, hasIntro: true, sort: 'price_desc' as const };
  const params = writeCatalogFilter(new URLSearchParams('utm_source=test&query=old&cursor=unused'), filter);
  expect(params.get('utm_source')).toBe('test');
  expect(readCatalogFilter(params, ['Русский язык'])).toEqual(filter);
  const reset = writeCatalogFilter(params, { sort: 'recommended' });
  expect(reset.has('query')).toBe(false);
  expect(reset.has('subject')).toBe(false);
});
it.each(['-1', 'NaN', '1.5', '1000001', 'Infinity', ''])('rejects invalid price %s', (value) => {
  const filter = readCatalogFilter(new URLSearchParams({ priceMin: value, sort: 'injection', subject: 'unknown' }), ['Математика']);
  expect(filter.priceMin).toBeUndefined();
  expect(filter.subject).toBeUndefined();
  expect(filter.sort).toBe('recommended');
});
