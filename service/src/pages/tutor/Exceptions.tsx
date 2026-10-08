import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, IBtn, Input, Note, St, cx } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, schedule, tutors as tApi, tutorById } from '../../api';
import type { TutorProfile } from '../../api/types';
import { nb } from '../../lib/text';
import { dateKey, fmtDateKey, monthGen, monthName, parseDateKey, weekdayOfKey } from '../../lib/time';
import { DAYS } from './shared';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;
const parseHour = (s: string) => { const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(s.trim()); return m ? Number(m[1]) : NaN; };

function ranges(hours: number[]) {
  const out: [number, number][] = [];
  for (const h of [...hours].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last[1] === h) last[1] = h + 1;
    else out.push([h, h + 1]);
  }
  return out.map(([a, b]) => `${hh(a)}–${hh(b)}`).join(', ');
}

const rangeLabel = (from: string, to: string) => {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  if (from === to) return fmtDateKey(from);
  return a.month === b.month ? `${a.day}–${b.day} ${monthGen(a.month)}` : `${a.day} ${monthGen(a.month)} – ${b.day} ${monthGen(b.month)}`;
};

export default function Exceptions() {
  const d = useDb();
  const me = useSession()!;
  const t = tutorById(d, me.id);
  if (!t) return <Navigate to="/tutor/lessons" replace />;
  return <Inner t={t} />;
}

function Inner({ t }: { t: TutorProfile }) {
  const at = useNow();
  const phone = usePhone();
  const { run } = useApp();
  const today = dateKey(at, t.tz);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [from, setFrom] = useState('15:00');
  const [to, setTo] = useState('18:00');
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [y, m] = month.split('-').map(Number);
  const firstKey = `${month}-01`;
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayOfKey(firstKey);
  const shift = (n: number) => { const dt = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`); };
  const pick = (k: string) => {
    if (rangeStart) {
      const [a, b] = k < rangeStart ? [k, rangeStart] : [rangeStart, k];
      run(() => tApi.addClosed(a, b, 'Отпуск'), `Закрыто: ${rangeLabel(a, b)}`);
      setRangeStart(null);
    }
    setSel(k);
  };
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(<span key={`e${i}`} />);
  for (let day = 1; day <= daysIn; day++) {
    const k = `${month}-${String(day).padStart(2, '0')}`;
    const past = k < today;
    const closed = schedule.isClosed(t, k);
    const plus = t.extra.some(w => w.date === k);
    const has = !closed && schedule.openHours(t, k).size > 0;
    const lbl = closed ? ', закрыто' : plus ? ', разовое окно' : has ? ', есть окна' : '';
    cells.push(<button key={k} type="button" disabled={past} className={cx(past && 'past', k === today && 'today', closed && 'closed', !closed && plus && 'plus', !past && has && 'has')} aria-pressed={k === sel ? true : undefined} aria-label={`${day} ${monthGen(m)}${lbl}`} onClick={() => pick(k)}>{day}</button>);
  }
  const regular = t.weekly[weekdayOfKey(sel)].map((on, h) => (on ? h : -1)).filter(h => h >= 0);
  const selClosed = t.closed.find(r => sel >= r.from && sel <= r.to);
  const selExtra = t.extra.filter(w => w.date === sel);
  const addWindow = () => {
    const a = parseHour(from);
    const b = parseHour(to);
    if (Number.isNaN(a) || Number.isNaN(b)) return run(() => { throw new Error('Время в формате 15:00'); });
    run(() => tApi.addExtra(sel, a, b), `Окно ${hh(a)}–${hh(b)} добавлено`);
  };
  const monthCard = (
    <>
      <div className="r2-mhead"><IBtn icon="left" label="Предыдущий месяц" onClick={() => shift(-1)} /><b className="h2">{`${monthName(m)} ${y}`}</b><IBtn icon="right" label="Следующий месяц" onClick={() => shift(1)} /></div>
      <div className={cx('r2-month', !phone && 'big')}>{DAYS.map(x => <span key={x} className="wd">{x}</span>)}{cells}</div>
    </>
  );
  const legend = <div className="r2-mlg"><span><i className="has" />Есть окна</span><span><i className="plus" />Разовое окно</span><span><i className="closed" />Закрыто</span></div>;
  const dayCard = (
    <div className="card">
      <div style={{ display: 'grid', gap: 2 }}><b className="h3">{fmtDateKey(sel)}</b><span className="small">{selClosed ? 'День закрыт' : regular.length ? nb(`По регулярной неделе: ${ranges(regular)}`) : 'По регулярной неделе выходной'}{selExtra.length > 0 && !selClosed ? nb(` · разовые окна ${selExtra.map(w => `${hh(w.from)}–${hh(w.to)}`).join(', ')}`) : ''}</span></div>
      {rangeStart ? <Note tone="action" icon="cal">{`Выберите последний день периода. Начало: ${fmtDateKey(rangeStart)}.`}</Note> : selClosed ? (
        <div className="row-s"><Btn size="m" onClick={() => run(() => tApi.removeClosed(selClosed.id), 'Дни снова открыты')}>Открыть снова</Btn></div>
      ) : (
        <>
          <span className="r2-lbl">Добавить разовое окно</span>
          <div className="r2-time"><Input value={from} onChange={e => setFrom(e.target.value)} aria-label="С" inputMode="numeric" /><span className="small">—</span><Input value={to} onChange={e => setTo(e.target.value)} aria-label="До" inputMode="numeric" /></div>
          <div className="row-s"><Btn v="primary" size="m" onClick={addWindow}>Добавить окно</Btn><Btn size="m" onClick={() => run(() => tApi.addClosed(sel, sel, 'Выходной'), 'День закрыт')}>Закрыть день</Btn><Btn size="m" onClick={() => setRangeStart(sel)}>Закрыть период</Btn></div>
        </>
      )}
      {rangeStart && <div><Btn size="s" onClick={() => setRangeStart(null)}>Отменить</Btn></div>}
    </div>
  );
  const futureClosed = t.closed.filter(r => r.to >= today).sort((a, b) => a.from.localeCompare(b.from));
  const futureExtra = t.extra.filter(w => w.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const lists = (
    <>
      {futureClosed.map(r => (
        <div className="card" key={r.id}>
          <div className="between"><b className="h3">{rangeLabel(r.from, r.to)}</b><St tone="bad">Закрыто</St></div>
          <p className="small" style={{ fontSize: 15 }}>{`${r.note ? `${r.note}. ` : ''}Окна в эти дни ученикам не показываются, уроков нет.`}</p>
          <div><Btn size="s" onClick={() => run(() => tApi.removeClosed(r.id), 'Дни снова открыты')}>Открыть снова</Btn></div>
        </div>
      ))}
      {futureExtra.map(w => (
        <div className="card" key={w.id}>
          <div className="between"><b className="h3">{fmtDateKey(w.date)}</b><St tone="action" icon="plus">Разовое окно</St></div>
          <p className="small" style={{ fontSize: 15 }}>{`${hh(w.from)}–${hh(w.to)}, сверх регулярной недели.`}</p>
          <div><Btn size="s" onClick={() => run(() => tApi.removeExtra(w.id), 'Окно убрано')}>Убрать окно</Btn></div>
        </div>
      ))}
    </>
  );
  if (phone)
    return (
      <Page title="Исключения" back="/tutor/profile/edit?step=4" right={<Btn size="s" to="/tutor/profile/edit?step=4">Готово</Btn>}>
        <p className="sub">{nb('Закройте дни отпуска или добавьте окно на дату. Регулярная неделя не меняется.')}</p>
        <div className="card" style={{ padding: '16px 12px' }}>{monthCard}</div>
        {legend}
        {dayCard}
        {lists}
      </Page>
    );
  return (
    <Page title="Исключения">
      <div style={{ maxWidth: 1080, width: '100%', justifySelf: 'center', display: 'grid', gap: 24 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div><Btn size="s" icon="left" to="/tutor/profile/edit?step=4">К регулярной неделе</Btn></div>
          <h1 className="h1">Исключения</h1>
          <p className="sub">Закройте дни отпуска или добавьте окно на конкретную дату. Регулярная неделя не меняется.</p>
        </div>
        <div className="cols c2">
          <div className="card" style={{ padding: 22, gap: 16 }}>{monthCard}{legend}</div>
          <div className="stack">{dayCard}{lists}</div>
        </div>
      </div>
    </Page>
  );
}
