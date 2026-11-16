import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const key = 'toprepet-mock-v3';
const freshApi = async () => {
  vi.resetModules();
  return (await import('./mock')).createMockApi();
};

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => storage.get(name) ?? null,
    setItem: (name: string, value: string) => storage.set(name, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

it('демоцены различаются, фильтр включает границы и сортирует по видимой цене', async () => {
  const api = await freshApi();
  const all = (await api.listTutors({ limit: 100 })).items;
  expect(all.length).toBeGreaterThan(5);
  expect(new Set(all.map(tutor => tutor.studentPrice)).size).toBe(all.length);
  const expected = all.filter(tutor => tutor.studentPrice >= 1000 && tutor.studentPrice <= 2500)
    .sort((a, b) => a.studentPrice - b.studentPrice);
  expect(expected.length).toBeGreaterThan(1);
  expect(expected.length).toBeLessThan(all.length);
  const filter = { priceMin: expected[0].studentPrice, priceMax: expected.at(-1)!.studentPrice };
  const ascending = (await api.listTutors({ ...filter, sort: 'price_asc' })).items;
  const descending = (await api.listTutors({ ...filter, sort: 'price_desc' })).items;
  expect(ascending.map(tutor => tutor.id)).toEqual(expected.map(tutor => tutor.id));
  expect(descending.map(tutor => tutor.id)).toEqual(expected.map(tutor => tutor.id).reverse());
});

it('старое демо получает новые цены без сброса сеанса, правок анкеты и цен записанных уроков', async () => {
  const api = await freshApi();
  await api.login('olga@mail.ru', 'demo');
  const legacy = JSON.parse(storage.get(key)!);
  delete legacy.demoPricesSeeded;
  for (const tutor of legacy.tutors) {
    tutor.price = 1200;
    tutor.studentPrice = 1320;
  }
  legacy.tutors.find((tutor: { id: string }) => tutor.id === 'english').price = 1700;
  legacy.tutors.find((tutor: { id: string }) => tutor.id === 'english').studentPrice = 1870;
  legacy.profiles.english.price = 1700;
  legacy.profiles['russian-literature'] = { ...legacy.profiles.english, price: 1200 };
  storage.set(key, JSON.stringify(legacy));
  const reloaded = await freshApi();
  expect((await reloaded.me())?.email).toBe('olga@mail.ru');
  expect((await reloaded.getTutor('english')).price).toBe(1700);
  expect((await reloaded.getTutor('russian-literature')).studentPrice).toBe(825);
  const migrated = JSON.parse(storage.get(key)!);
  expect(migrated.demoPricesSeeded).toBe(true);
  expect(migrated.profiles.english.price).toBe(1700);
  expect(migrated.profiles['russian-literature'].price).toBe(750);
  for (const field of ['users', 'lessons', 'messages', 'requests', 'responses']) {
    expect(migrated[field]).toEqual(legacy[field]);
  }
});
