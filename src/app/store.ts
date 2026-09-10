import { configureStore } from '@reduxjs/toolkit';
import { lessonSlice } from '../features/select-lesson/model/slice';
export const store = configureStore({
  reducer: { lesson: lessonSlice.reducer },
});
export type RootState = ReturnType<typeof store.getState>;
