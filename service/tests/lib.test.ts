import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dative, genitive, instrumental } from '../src/lib/names.ts';

test('names: cases used in interface phrases', () => {
  assert.equal(genitive('Анна'), 'Анны');
  assert.equal(dative('Анна'), 'Анне');
  assert.equal(instrumental('Анна'), 'Анной');
  assert.equal(genitive('Дмитрий'), 'Дмитрия');
  assert.equal(instrumental('Игорь'), 'Игорем');
});
