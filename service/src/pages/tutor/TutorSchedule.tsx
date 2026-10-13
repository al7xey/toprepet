import { useState, type SubmitEvent } from 'react';
import { useSession } from '../../api/session';
import { getSchedule, saveSchedule, type HorizonWeeks, type LeadHours, type Schedule } from '../../api/schedule';
import { useAsync } from '../../api/useAsync';
import {
  DAY_MIN,
  GRID,
  STEP,
  WEEKDAYS,
  cellIn,
  dayLong,
  dayShort,
  diffWins,
  fmtMin,
  fmtWin,
  sortWins,
  toggleCell,
  windowError,
  windowLocked,
  type Busy,
  type Win,
} from '../../lib/schedule';
import { utcLabel, zoneCity } from '../../lib/time';
import { SelectField } from '../../ui/Field';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

const HORIZONS: { value: HorizonWeeks; label: string }[] = [
  { value: 1, label: '1 неделю' },
  { value: 2, label: '2 недели' },
  { value: 4, label: '4 недели' },
];
const LEADS: LeadHours[] = [12, 24];

/* Р3.1 + Р3.2: /tutor/schedule/, mockup screen tutorSchedule. Times are the tutor's own wall clock in profiles.tz. */
export function TutorSchedule() {
  usePageMeta('Расписание', { noindex: true });
  const { profile } = useSession();
  const id = profile?.id ?? '';
  const tz = profile?.tz ?? 'Europe/Moscow';
  const data = useAsync(() => getSchedule(id, tz), `${id}:${tz}`);

  const head = (
    <div className="row sb">
      <h1 className="h1">Расписание</h1>
      <span className="mut" data-testid="tutor-zone">
        {zoneCity(tz)}, {utcLabel(tz)}
      </span>
    </div>
  );
  if (data.loading) return <>{head}<Loading /></>;
  if (data.error || !data.data) return <LoadError title="Не получилось загрузить расписание" onRetry={data.reload} />;
  return (
    <>
      {head}
      <Editor id={id} tz={tz} initial={data.data} />
    </>
  );
}

function Editor({ id, tz, initial }: { id: string; tz: string; initial: Schedule }) {
  const [saved, setSaved] = useState(initial);
  const [wins, setWins] = useState<Win[]>(initial.windows);
  const [horizon, setHorizon] = useState<HorizonWeeks>(initial.horizonWeeks);
  const [lead, setLead] = useState<LeadHours>(initial.minLeadHours);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [night, setNight] = useState(false);

  const locked = (w: Win) => windowLocked(w, saved.busy);
  const diff = diffWins(saved.windows, wins);
  const dirty = diff.add.length > 0 || diff.remove.length > 0 || horizon !== saved.horizonWeeks || lead !== saved.minLeadHours;

  function toggle(weekday: number, minute: number) {
    const next = toggleCell(wins, weekday, minute);
    const { remove } = diffWins(wins, next);
    if (remove.some(locked)) {
      setNotice({ ok: false, text: 'В этом окне есть записи учеников, его нельзя менять.' });
      return;
    }
    setNotice(null);
    setWins(next);
  }

  function remove(w: Win) {
    setNotice(null);
    setWins(wins.filter(x => x !== w));
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    const res = await saveSchedule(id, tz, saved.windows, wins, { horizonWeeks: horizon, minLeadHours: lead });
    if (res.ok) {
      try {
        const fresh = await getSchedule(id, tz);
        setSaved(fresh);
        setWins(fresh.windows);
        setNotice({ ok: true, text: 'Сохранили расписание.' });
      } catch {
        setNotice({ ok: true, text: 'Сохранили расписание. Обновите страницу, чтобы увидеть его.' });
      }
    } else {
      setNotice({
        ok: false,
        text:
          res.reason === 'locked'
            ? 'В одном из удалённых окон уже есть запись ученика. Верните окно и сохраните снова.'
            : res.reason === 'overlap'
              ? 'Окна пересекаются. Проверьте время и сохраните снова.'
              : 'Не получилось сохранить. Проверьте интернет и попробуйте ещё раз.',
      });
    }
    setBusy(false);
  }

  const first = Math.min(night ? 0 : 8, ...wins.map(w => Math.floor(w.start / 60)));
  const last = Math.max(night ? 23 : 22, ...wins.map(w => Math.ceil(w.end / 60) - 1));
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);

  return (
    <div className="two">
      <div className="stack l">
        <div className="stack">
          <div className="tw">
            <table className="wk">
              <caption className="sr-only">Свободные окна по дням недели, время {zoneCity(tz)}</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Время</span></th>
                  {WEEKDAYS.map(d => (
                    <th key={d} scope="col">
                      {dayShort(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(h => (
                  <tr key={h}>
                    <th scope="row">{fmtMin(h * 60)}</th>
                    {WEEKDAYS.map(d => (
                      <td key={d}>
                        {[h * 60, h * 60 + STEP].map(m => (
                          <Cell key={m} weekday={d} minute={m} wins={wins} busy={saved.busy} locked={locked} onToggle={toggle} />
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <span className="lg">
              <i className="o" />
              Свободно
            </span>
            <span className="lg">
              <i className="pd" />
              Ждёт подтверждения
            </span>
            <span className="lg">
              <i className="bk" />
              Занятие
            </span>
            <span className="lg">
              <i />
              Закрыто
            </span>
            <button type="button" className="lnk sm tap" onClick={() => setNight(!night)}>
              {night ? 'Скрыть ночные часы' : 'Показать ночные часы'}
            </button>
          </div>
          <p className="hint">Нажмите на&nbsp;клетку, чтобы открыть или закрыть полчаса. Время ваше: {zoneCity(tz)}, {utcLabel(tz)}.</p>
        </div>

        <WindowList wins={wins} locked={locked} onRemove={remove} />
        <AddWindow
          wins={wins}
          onAdd={w => {
            setNotice(null);
            setWins(sortWins([...wins, w]));
          }}
        />
      </div>

      <aside className="stack l sticky">
        <fieldset className="stack">
          <legend className="h3">Записываться можно вперёд на</legend>
          <div className="opts">
            {HORIZONS.map(o => (
              <label key={o.value} className="opt">
                <input type="radio" name="horizon" checked={horizon === o.value} onChange={() => setHorizon(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="stack">
          <legend className="h3">Не раньше чем за</legend>
          <div className="opts">
            {LEADS.map(v => (
              <label key={v} className="opt">
                <input type="radio" name="lead" checked={lead === v} onChange={() => setLead(v)} />
                {v}&nbsp;ч
              </label>
            ))}
          </div>
          <span className="hint">Ученики не&nbsp;увидят окна в&nbsp;прошлом и&nbsp;ближе {lead}&nbsp;часов.</span>
        </fieldset>
        {notice ? (
          <output className={notice.ok ? 'toast' : 'alert'} role={notice.ok ? 'status' : 'alert'}>
            {notice.text}
          </output>
        ) : dirty ? (
          <span className="hint">Есть несохранённые изменения</span>
        ) : null}
        <button type="button" className="btn p w" disabled={busy} onClick={() => void save()}>
          Сохранить
        </button>
      </aside>
    </div>
  );
}

function Cell({
  weekday,
  minute,
  wins,
  busy,
  locked,
  onToggle,
}: {
  weekday: number;
  minute: number;
  wins: Win[];
  busy: Busy[];
  locked: (w: Win) => boolean;
  onToggle: (weekday: number, minute: number) => void;
}) {
  const win = wins.find(w => w.weekday === weekday && cellIn(w, minute));
  const booking = busy.find(b => b.weekday === weekday && cellIn(b, minute));
  const cls = booking ? (booking.status === 'confirmed' ? 'bk' : 'pd') : win ? 'o' : '';
  const isLocked = Boolean(win && locked(win));
  const state = booking ? (booking.status === 'confirmed' ? 'занятие' : 'ждёт подтверждения') : win ? 'свободно' : 'закрыто';
  return (
    <button
      type="button"
      className={`hc ${minute % 60 ? 'b' : 't'} ${cls}`}
      aria-pressed={Boolean(win)}
      aria-label={`${dayShort(weekday)} ${fmtMin(minute)}–${fmtMin(minute + STEP)}, ${state}`}
      disabled={isLocked}
      onClick={() => onToggle(weekday, minute)}
    />
  );
}

function WindowList({ wins, locked, onRemove }: { wins: Win[]; locked: (w: Win) => boolean; onRemove: (w: Win) => void }) {
  return (
    <section className="stack s" aria-labelledby="wins-ttl">
      <b className="h3" id="wins-ttl">
        Окна по&nbsp;дням
      </b>
      {wins.length === 0 ? <p className="mut">Окон пока нет. Добавьте время, когда готовы заниматься.</p> : null}
      <ul className="wl" aria-labelledby="wins-ttl">
        {WEEKDAYS.filter(d => wins.some(w => w.weekday === d)).map(d => (
          <li key={d}>
            <span className="d">{dayLong(d)}</span>
            <span className="chips">
              {wins
                .filter(w => w.weekday === d)
                .map(w =>
                  locked(w) ? (
                    <span key={`${w.start}`} className="chip">
                      {fmtWin(w)}
                      <small className="mut">&nbsp;есть записи</small>
                    </span>
                  ) : (
                    <span key={`${w.start}`} className="chip on">
                      {fmtWin(w)}
                      <button type="button" className="chip-x" aria-label={`Удалить окно ${dayShort(d)} ${fmtWin(w)}`} onClick={() => onRemove(w)} />
                    </span>
                  ),
                )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AddWindow({ wins, onAdd }: { wins: Win[]; onAdd: (w: Win) => void }) {
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState(600);
  const [end, setEnd] = useState(720);
  const [error, setError] = useState<string | null>(null);

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const w = { weekday, start, end };
    const err = windowError(wins, w);
    setError(err);
    if (!err) onAdd(w);
  }

  return (
    <form className="card stack" onSubmit={submit} noValidate aria-labelledby="add-ttl">
      <b className="h3" id="add-ttl">
        Добавить окно
      </b>
      <div className="trio">
        <SelectField label="День недели" value={weekday} onChange={e => setWeekday(Number(e.target.value))}>
          {WEEKDAYS.map(d => (
            <option key={d} value={d}>
              {dayLong(d)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Начало" value={start} onChange={e => setStart(Number(e.target.value))} error={error}>
          {GRID.filter(m => m < DAY_MIN).map(m => (
            <option key={m} value={m}>
              {fmtMin(m)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Конец" value={end} onChange={e => setEnd(Number(e.target.value))}>
          {GRID.filter(m => m > 0).map(m => (
            <option key={m} value={m}>
              {fmtMin(m)}
            </option>
          ))}
        </SelectField>
      </div>
      <button type="submit" className="btn s" style={{ justifySelf: 'start' }}>
        Добавить окно
      </button>
      <span className="hint">Окно добавится в&nbsp;сетку; чтобы ученики его увидели, нажмите «Сохранить».</span>
    </form>
  );
}
