import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  initialSelection,
  isGoal,
  availableGrades,
  subjects,
  foundationSubjects,
  exams,
  examSubjects,
} from '../../../entities/lesson';
function normalize(state: typeof initialSelection) {
  const allowed =
    state.goal === 'foundation'
      ? foundationSubjects
      : state.goal === 'exam'
        ? examSubjects
        : subjects;
  if (state.subject && !allowed.some((s) => s === state.subject))
    state.subject = '';
  if (
    state.goal === 'foundation' &&
    state.subject === 'Подготовка к школе'
  )
    state.grade = 'До школы';
  else if (
    !availableGrades(state.goal, state.subject).includes(
      state.grade,
    )
  )
    state.grade = '';
}
export const lessonSlice = createSlice({
  name: 'lesson',
  initialState: initialSelection,
  reducers: {
    setPromoCode(state, action: PayloadAction<string>) {
      state.promoCode = action.payload.slice(0, 64);
    },
    setGoal(state, action: PayloadAction<string>) {
      if (!isGoal(action.payload)) return;
      state.goal = action.payload;
      normalize(state);
    },
    setSubject(state, action: PayloadAction<string>) {
      const allowed =
        state.goal === 'foundation'
          ? foundationSubjects
          : state.goal === 'exam'
            ? examSubjects
            : subjects;
      if (action.payload !== '' && !allowed.some((s) => s === action.payload))
        return;
      state.subject = action.payload;
      normalize(state);
    },
    setGrade(state, action: PayloadAction<string>) {
      if (
        !availableGrades(state.goal, state.subject).includes(
          action.payload,
        )
      )
        return;
      state.grade = action.payload;
    },
    setExam(state, action: PayloadAction<string>) {
      if (!exams.some((e) => e === action.payload)) return;
      state.exam = action.payload;
      normalize(state);
    },
    resetSelection() {
      return initialSelection;
    },
  },
});
export const { setGoal, setSubject, setGrade, setExam, setPromoCode, resetSelection } =
  lessonSlice.actions;
