import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadRedirects, redirectFor } from '../redirects.ts';

test('О3: старые адреса лендинга ведут в каталог (service/redirects.json)', () => {
  const list = loadRedirects();
  assert.equal(redirectFor('/lessons/', list), '/teachers/');
  assert.equal(redirectFor('/lessons', list), '/teachers/');
  assert.equal(redirectFor('/free-intro/', list), '/teachers/');
  assert.equal(redirectFor('/teacher/english/', list), '/teachers/english/');
  assert.equal(redirectFor('/direction/oge/', list), '/teachers/?goal=oge');
  assert.equal(redirectFor('/teachers/', list), null);
  assert.equal(redirectFor('/lessons/extra/', list), null);
  assert.equal(redirectFor('/cabinet/lessons/1', list), null);
});
