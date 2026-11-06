import type { TutorFilter } from '../api/types';
const KEYS = ['query', 'subject', 'sort', 'priceMin', 'priceMax', 'intro'];
const price = (value: string | null) => value !== null && value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1_000_000 ? Number(value) : undefined;
export function readCatalogFilter(params: URLSearchParams, subjects: readonly string[]): TutorFilter {
  const sort = params.get('sort');
  return {
    query: params.get('query')?.trim().slice(0, 200) || undefined,
    subject: subjects.find((subject) => subject === params.get('subject')),
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'recommended',
    priceMin: price(params.get('priceMin')), priceMax: price(params.get('priceMax')),
    hasIntro: params.get('intro') === '1' || undefined,
  };
}
export function writeCatalogFilter(current: URLSearchParams, filter: TutorFilter): URLSearchParams {
  const next = new URLSearchParams(current);
  KEYS.forEach((key) => next.delete(key));
  if (filter.query) next.set('query', filter.query);
  if (filter.subject) next.set('subject', filter.subject);
  if (filter.sort && filter.sort !== 'recommended') next.set('sort', filter.sort);
  if (filter.priceMin != null) next.set('priceMin', String(filter.priceMin));
  if (filter.priceMax != null) next.set('priceMax', String(filter.priceMax));
  if (filter.hasIntro) next.set('intro', '1');
  return next;
}
