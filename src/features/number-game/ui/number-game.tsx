import { useReducer } from 'react';
import { gameReducer, initialGame, rounds } from '../model/game';
import './number-game.css';
export function NumberGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGame);
  const round = rounds[state.round];
  const values: number[] = state.selected.map((i) => round.numbers[i]);
  const sum = values.reduce((a, b) => a + b, 0);
  const solved = state.status === 'solved';
  const finished = state.status === 'finished';
  const feedback = finished
    ? 'Три задачи решены. Отличная разминка!'
    : solved
      ? `${values.join(' + ')} = ${round.target}. Всё верно!`
      : state.status === 'wrong'
        ? `${values.join(' + ')} = ${sum}. Попробуйте другую пару.`
        : state.selected.length === 1
          ? 'Теперь выберите второе число.'
          : 'Можно начать с любого числа.';
  return (
    <section className="number-game" aria-labelledby="game-title">
      <div className="game-heading">
        <h2 id="game-title">Разминка для ума</h2>
        <span className="game-progress">
          {finished ? 'Готово' : `${state.round + 1} из ${rounds.length}`}
        </span>
      </div>
      <p className="game-instruction">
        {finished
          ? 'Маленький шаг к большим знаниям.'
          : 'Выберите два числа, чтобы получить'}
      </p>
      <div
        className="game-target"
        data-state={state.status}
        aria-label={
          finished ? 'Все задачи решены' : `Нужная сумма: ${round.target}`
        }
      >
        <span aria-hidden="true">{finished ? '✓' : round.target}</span>
      </div>
      {!finished ? (
        <fieldset className="game-numbers" aria-label="Числа для сложения">
          {round.numbers.map((number, index) => (
            <button
              type="button"
              key={`${state.round}-${index}`}
              className={
                'number-tile' +
                (state.selected.includes(index) ? ' is-selected' : '')
              }
              aria-pressed={state.selected.includes(index)}
              disabled={solved}
              onClick={() => dispatch({ type: 'choose', index })}
            >
              {number}
            </button>
          ))}
        </fieldset>
      ) : (
        <div className="game-finished">
          <p>
            Когда находишь решение сам,
            <br />
            учиться интереснее.
          </p>
        </div>
      )}
      <output className="game-feedback" aria-live="polite" aria-atomic="true">
        <p>{feedback}</p>
      </output>
      {state.showHint && !finished ? (
        <p id="game-hint" className="game-hint">
          {round.hint}
        </p>
      ) : null}
      <div className="game-actions">
        {finished ? (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => dispatch({ type: 'restart' })}
          >
            Сыграть ещё
          </button>
        ) : solved ? (
          <button
            className="button button-primary"
            type="button"
            onClick={() => dispatch({ type: 'next' })}
          >
            {state.round === rounds.length - 1
              ? 'Завершить'
              : 'Следующая задача'}
          </button>
        ) : (
          <button
            className="game-hint-button"
            type="button"
            aria-expanded={state.showHint}
            aria-controls="game-hint"
            onClick={() => dispatch({ type: 'hint' })}
          >
            {state.showHint ? 'Скрыть подсказку' : 'Подсказка'}
          </button>
        )}
      </div>
    </section>
  );
}
