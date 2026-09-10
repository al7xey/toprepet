import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { directions, groups } = await server.ssrLoadModule(
    '/src/entities/direction/model/directions.ts',
  );
  const { directionFilterSlice, setGroup } = await server.ssrLoadModule(
    '/src/features/filter-directions/model/slice.ts',
  );
  const { PRICE, PRICE_LABEL, telegramLink } = await server.ssrLoadModule(
    '/src/shared/config/site.ts',
  );
  assert.equal(PRICE, 1200);
  assert.equal(directions.length, 7);
  assert.equal(new Set(directions.map((d) => d.id)).size, 7);
  assert.deepEqual(
    directions.map((d) => d.id),
    [
      'school-start',
      'primary',
      'school-program',
      'homework',
      'subjects',
      'oge',
      'ege',
    ],
  );
  let state = directionFilterSlice.reducer(undefined, { type: 'init' });
  assert.equal(state.group, groups[0]);
  for (const group of groups) {
    state = directionFilterSlice.reducer(state, setGroup(group));
    const visible = directions.filter(
      (d) => state.group === groups[0] || d.group === state.group,
    );
    assert.equal(
      visible.length,
      {
        'Все направления': 7,
        'Начало учёбы': 2,
        'Школьная программа': 3,
        Экзамены: 2,
      }[group],
    );
  }
  const url = new URL(telegramLink('ОГЭ & ЕГЭ'));
  assert.equal(url.origin + url.pathname, 'https://t.me/a17xey');
  assert.ok(url.searchParams.get('text').includes('ОГЭ & ЕГЭ'));
  assert.equal(telegramLink(), 'https://t.me/a17xey');
  const { createElement: h } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter, Routes, Route } = await import('react-router-dom');
  const { default: DirectionPage } = await server.ssrLoadModule(
    '/src/pages/direction/direction-page.tsx',
  );
  for (const direction of directions) {
    const html = renderToStaticMarkup(
      h(
        MemoryRouter,
        { initialEntries: [`/direction/${direction.id}`] },
        h(
          Routes,
          null,
          h(Route, { path: '/direction/:id', element: h(DirectionPage) }),
        ),
      ),
    );
    assert.ok(html.includes(direction.label));
    assert.ok(html.includes(PRICE_LABEL));
    assert.ok(html.includes('бесплатно'));
    assert.ok(!html.includes('<form'));
    assert.ok(html.includes('https://t.me/a17xey?text='));
  }
  const unknown = renderToStaticMarkup(
    h(
      MemoryRouter,
      { initialEntries: ['/direction/missing'] },
      h(
        Routes,
        null,
        h(Route, { path: '/direction/:id', element: h(DirectionPage) }),
      ),
    ),
  );
  assert.ok(unknown.includes('404'));
  console.log(
    'PASS: seven routes, unknown-route fallback, all four Redux filters, fixed price, encoded Telegram draft, no contact forms.',
  );
} finally {
  await server.close();
}
