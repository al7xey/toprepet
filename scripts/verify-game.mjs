import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const {
    gameReducer: reduce,
    initialGame,
    rounds,
  } = await server.ssrLoadModule('/src/features/number-game/model/game.ts');
  assert.deepEqual(reduce(initialGame, { type: 'next' }), initialGame);
  for (const index of [-1, 99, NaN, 1.5])
    assert.deepEqual(
      reduce(initialGame, { type: 'choose', index }),
      initialGame,
    );
  let state = reduce(initialGame, { type: 'choose', index: 0 });
  state = reduce(state, { type: 'choose', index: 0 });
  assert.equal(state.selected.length, 0);
  state = reduce(state, { type: 'choose', index: 0 });
  state = reduce(state, { type: 'choose', index: 1 });
  assert.equal(state.status, 'wrong');
  assert.deepEqual(reduce(state, { type: 'next' }), state);
  state = reduce(state, { type: 'hint' });
  assert.equal(state.showHint, true);
  state = reduce(state, { type: 'choose', index: 4 });
  assert.deepEqual(state.selected, [4]);
  assert.equal(state.status, 'playing');
  state = reduce(state, { type: 'restart' });
  assert.deepEqual(state, initialGame);
  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    let solutions = 0;
    for (let a = 0; a < round.numbers.length; a++)
      for (let b = a + 1; b < round.numbers.length; b++) {
        let pair = reduce(
          { ...initialGame, round: r, selected: [] },
          { type: 'choose', index: a },
        );
        pair = reduce(pair, { type: 'choose', index: b });
        const correct = round.numbers[a] + round.numbers[b] === round.target;
        assert.equal(pair.status, correct ? 'solved' : 'wrong');
        if (correct) solutions++;
      }
    assert.ok(solutions > 0, 'Every round must have a solution');
    const a = round.numbers.findIndex((value, index) =>
      round.numbers.some(
        (other, j) => j !== index && value + other === round.target,
      ),
    );
    const b = round.numbers.findIndex(
      (value, index) =>
        index !== a && round.numbers[a] + value === round.target,
    );
    state = reduce(state, { type: 'choose', index: a });
    state = reduce(state, { type: 'choose', index: b });
    assert.equal(state.status, 'solved');
    assert.deepEqual(reduce(state, { type: 'choose', index: 0 }), state);
    state = reduce(state, { type: 'next' });
    assert.equal(
      state.status,
      r === rounds.length - 1 ? 'finished' : 'playing',
    );
  }
  assert.deepEqual(reduce(state, { type: 'restart' }), initialGame);
  console.log(
    'PASS: all number pairs, wrong answers, deselection, hints, invalid indices, three-round completion and restart.',
  );
} finally {
  await server.close();
}
