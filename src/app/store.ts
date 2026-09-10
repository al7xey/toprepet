import { configureStore } from '@reduxjs/toolkit';
import { directionFilterSlice } from '../features/filter-directions/model/slice';
export const store = configureStore({
  reducer: { directionFilter: directionFilterSlice.reducer },
});
export type RootState = ReturnType<typeof store.getState>;
