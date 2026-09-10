import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DirectionGroup } from '../../../entities/direction/model/directions';
export const directionFilterSlice = createSlice({
  name: 'directionFilter',
  initialState: { group: 'Все направления' as DirectionGroup },
  reducers: {
    setGroup(state, action: PayloadAction<DirectionGroup>) {
      state.group = action.payload;
    },
  },
});
export const { setGroup } = directionFilterSlice.actions;
