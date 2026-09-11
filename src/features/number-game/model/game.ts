export const rounds = [
  {
    target: 10,
    numbers: [2, 6, 3, 8, 4, 5],
    hint: 'Начните с 6. Сколько не хватает до 10?',
  },
  {
    target: 12,
    numbers: [3, 7, 4, 9, 5, 8],
    hint: 'Начните с 7. Сколько нужно добавить до 12?',
  },
  {
    target: 15,
    numbers: [6, 9, 2, 8, 7, 4],
    hint: 'Начните с 8. Какое число дополнит его до 15?',
  },
] as const;
export interface GameState {
  round: number;
  selected: number[];
  status: 'playing' | 'wrong' | 'solved' | 'finished';
  showHint: boolean;
}
export type GameAction =
  | { type: 'choose'; index: number }
  | { type: 'next' }
  | { type: 'hint' }
  | { type: 'restart' };
export const initialGame: GameState = {
  round: 0,
  selected: [],
  status: 'playing',
  showHint: false,
};
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'restart') return { ...initialGame, selected: [] };
  if (action.type === 'next') {
    if (state.status !== 'solved') return state;
    return state.round === rounds.length - 1
      ? { ...state, status: 'finished' }
      : { ...initialGame, round: state.round + 1, selected: [] };
  }
  if (action.type === 'hint')
    return state.status === 'playing' || state.status === 'wrong'
      ? { ...state, showHint: !state.showHint }
      : state;
  if (state.status === 'solved' || state.status === 'finished') return state;
  const round = rounds[state.round];
  if (
    !Number.isInteger(action.index) ||
    action.index < 0 ||
    action.index >= round.numbers.length
  )
    return state;
  const selected = state.selected.includes(action.index)
    ? state.selected.filter((i) => i !== action.index)
    : state.selected.length === 2
      ? [action.index]
      : [...state.selected, action.index];
  const sum = selected.reduce((total, i) => total + round.numbers[i], 0);
  const status =
    selected.length < 2 ? 'playing' : sum === round.target ? 'solved' : 'wrong';
  return {
    ...state,
    selected,
    status,
    showHint: status === 'solved' ? false : state.showHint,
  };
}
