import { useDispatch, useSelector } from 'react-redux';
import {
  groups,
  type DirectionGroup,
} from '../../../entities/direction/model/directions';
import { setGroup } from '../model/slice';
export function DirectionFilter() {
  const dispatch = useDispatch();
  const group = useDirectionGroup();
  return (
    <div className="filter-scroll">
      <fieldset className="filter-group">
        <legend className="sr-only">Фильтр направлений</legend>
        {groups.map((item) => (
          <button
            key={item}
            type="button"
            className="filter-chip"
            aria-pressed={group === item}
            onClick={() => dispatch(setGroup(item))}
          >
            {item}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
export function useDirectionGroup() {
  return useSelector(
    (state: { directionFilter: { group: DirectionGroup } }) =>
      state.directionFilter.group,
  );
}
