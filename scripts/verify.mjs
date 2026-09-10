import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { initialSelection, selectionDescription, legacyGoal, isGoal } =
    await server.ssrLoadModule('/src/entities/lesson/model/catalog.ts');
  const {
    lessonSlice,
    setGoal,
    setSubject,
    setGrade,
    setExam,
    resetSelection,
  } = await server.ssrLoadModule('/src/features/select-lesson/model/slice.ts');
  const { PRICE, telegramLink } = await server.ssrLoadModule(
    '/src/shared/config/site.ts',
  );
  const reduce = lessonSlice.reducer;
  let state = reduce(undefined, { type: 'init' });
  state = reduce(state, setGoal('homework'));
  state = reduce(state, setSubject('Математика'));
  state = reduce(state, setGrade('5'));
  const url = new URL(telegramLink(selectionDescription(state)));
  assert.equal(url.origin + url.pathname, 'https://t.me/a17xey');
  assert.match(
    url.searchParams.get('text'),
    /Домашние задания · Математика · 5 класс/,
  );
  assert.equal(PRICE, 1200);
  assert.equal(telegramLink(), 'https://t.me/a17xey');
  assert.match(
    new URL(telegramLink('ОГЭ & ЕГЭ')).searchParams.get('text'),
    /ОГЭ & ЕГЭ/,
  );

  state = reduce(state, setGoal('exam'));
  assert.equal(state.grade, '9');
  state = reduce(state, setExam('ЕГЭ'));
  assert.equal(state.grade, '11');
  assert.equal(state.subject, 'Математика');
  assert.match(selectionDescription(state), /ЕГЭ · 11 класс/);
  assert.deepEqual(reduce(state, setGrade('5')), state);

  state = reduce(state, setGoal('foundation'));
  assert.equal(state.subject, '');
  assert.equal(state.grade, '');
  state = reduce(state, setSubject('Подготовка к школе'));
  assert.equal(state.grade, 'До школы');
  state = reduce(state, setSubject('Начальные классы'));
  assert.equal(state.grade, '');
  state = reduce(state, setGrade('3'));
  assert.equal(state.grade, '3');
  for (const action of [
    setGoal('bad'),
    setSubject('Физика'),
    setGrade('11'),
    setExam('bad'),
  ]) {
    assert.deepEqual(reduce(state, action), state);
  }
  state = reduce(state, setGoal('subject'));
  assert.equal(state.subject, '');
  assert.equal(state.grade, '3');
  assert.deepEqual(reduce(state, resetSelection()), initialSelection);
  assert.equal(Object.keys(legacyGoal).length, 7);
  assert.ok(Object.values(legacyGoal).every(isGoal));
  assert.equal(Object.hasOwn(legacyGoal, 'constructor'), false);
  assert.equal(isGoal('__proto__'), false);

  const { createElement: h } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { MemoryRouter, Routes, Route } = await import('react-router-dom');
  const { default: DirectionPage } = await server.ssrLoadModule(
    '/src/pages/direction/direction-page.tsx',
  );
  for (const id of ['missing', 'constructor', '__proto__']) {
    const html = renderToStaticMarkup(
      h(
        MemoryRouter,
        { initialEntries: ['/direction/' + id] },
        h(
          Routes,
          null,
          h(Route, { path: '/direction/:id', element: h(DirectionPage) }),
        ),
      ),
    );
    assert.ok(html.includes('404'));
  }
  console.log(
    'PASS: lesson selection transitions, incompatible values, exam grades, reset, Telegram draft, fixed price and legacy-route fallbacks.',
  );
} finally {
  await server.close();
}
