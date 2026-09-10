import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  initialSelection,
  isGoal,
  availableGrades,
  subjects,
  foundationSubjects,
  exams,
} from '../../../entities/lesson';
function normalize(state: typeof initialSelection) {
  const allowed = state.goal === 'foundation' ? foundationSubjects : subjects;
  if (state.subject && !allowed.some((s) => s === state.subject))
    state.subject = '';
  if (state.goal === 'exam') state.grade = state.exam === 'ЕГЭ' ? '11' : '9';
  else if (
    state.goal === 'foundation' &&
    state.subject === 'Подготовка к школе'
  )
    state.grade = 'До школы';
  else if (
    !availableGrades(state.goal, state.subject, state.exam).includes(
      state.grade,
    )
  )
    state.grade = '';
}
export const lessonSlice = createSlice({
  name: 'lesson',
  initialState: initialSelection,
  reducers: {
    setGoal(state, action: PayloadAction<string>) {
      if (!isGoal(action.payload)) return;
      state.goal = action.payload;
      normalize(state);
    },
    setSubject(state, action: PayloadAction<string>) {
      const allowed =
        state.goal === 'foundation' ? foundationSubjects : subjects;
      if (action.payload !== '' && !allowed.some((s) => s === action.payload))
        return;
      state.subject = action.payload;
      normalize(state);
    },
    setGrade(state, action: PayloadAction<string>) {
      if (
        !availableGrades(state.goal, state.subject, state.exam).includes(
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
export const { setGoal, setSubject, setGrade, setExam, resetSelection } =
  lessonSlice.actions;
