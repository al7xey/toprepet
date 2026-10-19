import { useState } from 'react';
import { Icon } from './icon';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const pad = (n: number) => String(n).padStart(2, '0');
/** «2026-10-19» без часовых поясов: берём локальные год, месяц и день */
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export type DayMark = 'off' | 'extra' | 'regular';

/**
 * Месячный календарь для выбора даты. Прошлые дни недоступны.
 * Отметки под числом: «regular» — по недельному расписанию есть время, «extra» — добавлено время, «off» — выходной.
 */
export function MonthCalendar({ value, onChange, markOf }: { value: string | null; onChange: (date: string) => void; markOf: (key: string, date: Date) => DayMark | undefined }) {
  const today = new Date();
  const todayKey = dateKey(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const title = month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const first = (month.getDay() + 6) % 7; // понедельник — первый столбец
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const canGoBack = month.getFullYear() > today.getFullYear() || month.getMonth() > today.getMonth();
  const shift = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <div className="trk-month">
      <div className="trk-month-head">
        <button type="button" className="trk-month-nav" aria-label="Предыдущий месяц" disabled={!canGoBack} onClick={() => shift(-1)}><Icon name="left" /></button>
        <b className="trk-month-title">{title}</b>
        <button type="button" className="trk-month-nav" aria-label="Следующий месяц" onClick={() => shift(1)}><Icon name="right" /></button>
      </div>
      <div className="trk-month-grid">
        {WEEKDAYS.map((w) => <span key={w} className="trk-month-wd" aria-hidden="true">{w}</span>)}
        {cells.map((date, i) => {
          if (!date) return <span key={`gap-${i}`} />;
          const key = dateKey(date);
          const past = key < todayKey;
          const mark = markOf(key, date);
          const label = `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}${mark === 'off' ? ', выходной' : mark === 'extra' ? ', добавлено время' : mark === 'regular' ? ', есть время по расписанию' : ', нет времени'}`;
          return (
            <button key={key} type="button" disabled={past} aria-label={label} aria-pressed={value === key}
              className={['trk-month-day', value === key && 'on', key === todayKey && 'today', mark && `m-${mark}`].filter(Boolean).join(' ')} onClick={() => onChange(key)}>
              <span>{date.getDate()}</span>
            </button>
          );
        })}
      </div>
      <ul className="trk-month-legend" aria-label="Обозначения">
        <li><span className="trk-month-key m-regular" />По расписанию</li>
        <li><span className="trk-month-key m-extra" />Добавлено время</li>
        <li><span className="trk-month-key m-off" />Выходной</li>
      </ul>
    </div>
  );
}
