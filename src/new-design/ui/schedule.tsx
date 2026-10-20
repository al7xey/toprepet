import type { WeekInterval, WeekSchedule } from '../api/types';
import { IconButton } from './kit';
import { Icon } from './icon';

export const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 05:00 … 23:00
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const hourOf = (value: string) => Number(value.split(':')[0]);

/** Проверка недели: «с» раньше «до», интервалы одного дня не пересекаются. Возвращает текст ошибки или null. */
export function weekProblem(week: WeekSchedule): string | null {
  for (const day of week.days) {
    const list = [...day.intervals].sort((a, b) => hourOf(a.from) - hourOf(b.from));
    for (let i = 0; i < list.length; i += 1) {
      if (hourOf(list[i].from) >= hourOf(list[i].to)) return `${WEEKDAYS[day.weekday - 1]}: время «до» должно быть позже «с»`;
      if (i > 0 && hourOf(list[i].from) < hourOf(list[i - 1].to)) return `${WEEKDAYS[day.weekday - 1]}: интервалы пересекаются`;
    }
  }
  return null;
}

export const weekIsEmpty = (week: WeekSchedule) => !week.days.some((d) => d.intervals.length);

function HourSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="trk-hour">
      <span className="trk-sr">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {HOURS.map((h) => <option key={h} value={hh(h)}>{hh(h)}</option>)}
      </select>
    </label>
  );
}

/** Редактор недельного расписания: по дням недели списки интервалов «с — до» (шаг — час). Один для мастера анкеты и страницы расписания. */
export function WeekEditor({ value, onChange }: { value: WeekSchedule; onChange: (week: WeekSchedule) => void }) {
  const dayOf = (weekday: number) => value.days.find((d) => d.weekday === weekday)?.intervals ?? [];
  const setDay = (weekday: number, intervals: WeekInterval[]) => {
    const has = value.days.some((d) => d.weekday === weekday);
    const days = has ? value.days.map((d) => (d.weekday === weekday ? { ...d, intervals } : d)) : [...value.days, { weekday, intervals }];
    onChange({ days: days.sort((a, b) => a.weekday - b.weekday) });
  };
  return (
    <div className="trk-week">
      {WEEKDAYS.map((name, index) => {
        const weekday = index + 1;
        const list = dayOf(weekday);
        return (
          <div className="trk-weekday" key={weekday}>
            <b className="trk-weekday-name">{name}</b>
            <div className="trk-weekday-body">
              {list.length === 0 && <span className="muted">Выходной</span>}
              {list.map((it, i) => (
                <div className="trk-interval" key={i}>
                  <HourSelect label={`${name}, начало`} value={it.from} onChange={(v) => setDay(weekday, list.map((x, j) => (j === i ? { ...x, from: v } : x)))} />
                  <span aria-hidden="true">—</span>
                  <HourSelect label={`${name}, конец`} value={it.to} onChange={(v) => setDay(weekday, list.map((x, j) => (j === i ? { ...x, to: v } : x)))} />
                  <button type="button" className="trk-iconbtn" aria-label={`${name}: убрать интервал`} onClick={() => setDay(weekday, list.filter((_, j) => j !== i))}><Icon name="x" /></button>
                </div>
              ))}
              <IconButton icon="plus" label="Добавить время" onClick={() => setDay(weekday, [...list, { from: list.length ? list[list.length - 1].to : '17:00', to: list.length ? hh(Math.min(23, hourOf(list[list.length - 1].to) + 2)) : '21:00' }])} className="trk-addbtn" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
