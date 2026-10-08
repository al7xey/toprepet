import { Chip, Empty, Note, St } from '../../ui/kit';
import { Ava } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, sel } from '../../api';
import { nb } from '../../lib/text';
import { DAY, fmtDateShort, MSK } from '../../lib/time';
import { AdminPage } from './shared';

export default function AdminCancellations() {
  const d = useDb();
  const at = useNow();
  const phone = usePhone();
  const rows = sel.cancellationStats(d, at);
  const total = rows.reduce((s, r) => s + r.cancels, 0);
  const late = rows.reduce((s, r) => s + r.late, 0);
  const flagged = rows.filter(r => r.flag).length;
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const badge = (flag: boolean) => (flag ? <St tone="bad" icon="warn">Проверить</St> : <St icon="check">Норма</St>);
  const kpis = (
    <div className="kpis" style={phone ? { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } : undefined}>
      <div className="kpi"><span>Отмен за 30 дней</span><b>{total}</b></div>
      <div className="kpi"><span>Поздних, меньше 4 ч</span><b>{late}</b></div>
      {!phone && <div className="kpi"><span>На проверке</span><b>{flagged}</b></div>}
    </div>
  );
  const note = <Note icon="eye">Видно только команде TopRepet. В анкете и каталоге этих отмен нет.</Note>;
  const chips = <div className="row-s"><Chip pressed>30 дней</Chip><Chip>Все причины</Chip></div>;
  const empty = <Empty icon="check" title="Репетиторы не отменяли уроки" style={{ maxWidth: 'none' }}>За последние 30 дней отмен нет.</Empty>;
  if (phone)
    return (
      <AdminPage title="Отмены" side="Отмены">
        <h1 className="h1">Отмены репетиторами</h1>
        {chips}{kpis}{note}
        {rows.length ? rows.map(r => (
          <div className="card" style={{ gap: 10 }} key={r.tutor.userId}>
            <div className="between"><span className="r7-who"><Ava tone={r.tutor.tone} src={r.tutor.photo} /><span>{r.tutor.name}</span></span>{badge(r.flag)}</div>
            <div className="r7-amb"><span>Уроков <b>{r.total}</b></span><span>Отмен <b>{r.cancels}</b></span><span>Поздних <b style={r.flag ? { color: 'var(--red)' } : undefined}>{r.late}</b></span><span>Доля <b>{nb(pct(r.share))}</b></span></div>
          </div>
        )) : empty}
      </AdminPage>
    );
  return (
    <AdminPage title="Отмены" side="Отмены">
      <div className="between" style={{ alignItems: 'flex-end' }}><div className="title-block"><h1 className="h1">Отмены репетиторами</h1><span className="sub">{nb(`${fmtDateShort(at - 30 * DAY, MSK)} – ${fmtDateShort(at, MSK)} · уроки, которые отменил репетитор`)}</span></div>{chips}</div>
      {kpis}{note}
      {rows.length ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="r7-tbl">
            <thead><tr><th>Репетитор</th><th className="n">Уроков</th><th className="n">Отмен</th><th className="n">{nb('Поздних, <4 ч')}</th><th className="n">Доля</th><th>Последняя причина</th><th>Статус</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.tutor.userId} className={r.flag ? 'flag' : undefined}>
                <td><span className="r7-who"><Ava tone={r.tutor.tone} src={r.tutor.photo} />{r.tutor.name}</span></td>
                <td className="n">{r.total}</td><td className="n">{r.cancels}</td>
                <td className="n">{r.flag ? <b style={{ color: 'var(--red)' }}>{r.late}</b> : r.late}</td>
                <td className="n">{nb(pct(r.share))}</td><td>{r.lastReason}</td><td>{badge(r.flag)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : empty}
    </AdminPage>
  );
}
