import { dateKey, fmtDay, fmtTime, NB } from '../lib/time';

/** Accessible name of a slot: the viewer's time and the tutor's (У2.1: «у репетитора 20:00»). */
export function slotName(ts: number, tz: string, tutorTz: string, withDay = false) {
  const own = withDay ? `${fmtDay(ts, tz)}, ${fmtTime(ts, tz)}` : fmtTime(ts, tz);
  const theirs = fmtTime(ts, tutorTz);
  return theirs === fmtTime(ts, tz) ? own : `${own}, у${NB}репетитора ${theirs}`;
}

/** SlotPicker buttons; starts on another day than `day` get the day in front («Сб 10:00»). */
export function SlotList({
  slots,
  tz,
  tutorTz,
  selected,
  day,
  onPick,
  label,
}: {
  slots: number[];
  tz: string;
  tutorTz: string;
  selected: number | null;
  day?: string;
  onPick: (ts: number) => void;
  label: string;
}) {
  return (
    <fieldset className="slots">
      <legend className="sr-only">{label}</legend>
      {slots.map(ts => {
        const other = day !== undefined && dateKey(ts, tz) !== day;
        return (
          <button
            key={ts}
            type="button"
            className={`slot${ts === selected ? ' on' : ''}`}
            aria-pressed={ts === selected}
            aria-label={slotName(ts, tz, tutorTz, other || day === undefined)}
            onClick={() => onPick(ts)}
          >
            {other || day === undefined ? `${fmtDay(ts, tz)}, ${fmtTime(ts, tz)}` : fmtTime(ts, tz)}
          </button>
        );
      })}
    </fieldset>
  );
}

/** У4.1-занят (mockup profileTaken): what happened and the nearest free starts of this tutor. */
export function TakenAlert({
  taken,
  nearest,
  tz,
  tutorTz,
  onPick,
}: {
  taken: number;
  nearest: number[] | null;
  tz: string;
  tutorTz: string;
  onPick: (ts: number) => void;
}) {
  return (
    <div className="stack s" role="alert">
      <div className="alert">
        <b>
          Слот {fmtDay(taken, tz)} {fmtTime(taken, tz)} уже занят
        </b>
        <span className="mut sm">
          {nearest && nearest.length === 0
            ? 'Его только что выбрал другой ученик. Свободного времени у репетитора больше нет.'
            : 'Его только что выбрал другой ученик. Ближайшие свободные:'}
        </span>
      </div>
      {nearest?.length ? <SlotList slots={nearest} tz={tz} tutorTz={tutorTz} selected={null} onPick={onPick} label="Ближайшие свободные" /> : null}
    </div>
  );
}
