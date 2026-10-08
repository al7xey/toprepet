import { useState } from 'react';
import { Page } from '../../ui/layout';
import { Alert, Btn, Chip, Dropdown, Empty, IBtn, MenuItem, Note, St } from '../../ui/kit';
import { Icon, type IconName } from '../../ui/icons';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, useSession, sel, lessonById, tutorById } from '../../api';
import type { Transfer } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { fmtDateShort, fmtDay, fmtDayTime, monthName, zoned } from '../../lib/time';

const MONTH_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

export default function Finance() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const [month, setMonth] = useState('');
  const [menu, setMenu] = useState(false);
  const t = tutorById(d, me.id);
  const tz = me.tz;
  const fin = sel.tutorFinance(d, me.id, at, tz);
  const all = d.transfers.filter(x => x.tutorId === me.id && x.status !== 'cancelled').map(x => ({ x, l: lessonById(d, x.lessonId) })).sort((a, b) => (b.l?.start ?? 0) - (a.l?.start ?? 0));
  const monthOf = (ts: number) => { const z = zoned(ts, tz); return `${z.year}-${String(z.month).padStart(2, '0')}`; };
  const months = [...new Set(all.map(r => monthOf(r.l?.start ?? r.x.dueAt)))];
  const list = all.filter(r => !month || monthOf(r.l?.start ?? r.x.dueAt) === month);
  const failed = all.find(r => r.x.status === 'failed');
  const cur = zoned(at, tz);
  const payout = t?.payout;
  const payoutLine = payout ? `${payout.status === 'ip' ? 'ИП' : 'Самозанятый'} · выплаты на карту •• ${payout.card.slice(-4)}` : 'Выплаты не настроены';
  const kpis = (
    <div className="kpis r8-kpis">
      <div className="kpi"><span>Заморожено</span><b>{fmtMoney(fin.frozen)}</b><small>за будущие уроки</small></div>
      <div className="kpi"><span>Ждёт перевода</span><b>{fmtMoney(fin.waiting)}</b><small>до 24 ч после урока</small></div>
      <div className="kpi"><span>Переведено</span><b>{fmtMoney(fin.sent)}</b><small>{`в ${MONTH_PREP[cur.month - 1]}`}</small></div>
      <div className={`kpi${fin.disputed ? ' is-bad' : ''}`}><span>В споре</span><b>{fmtMoney(fin.disputed)}</b><small>{fin.disputed && fin.disputeDecideBy ? `решение до ${fmtDateShort(fin.disputeDecideBy, tz)}` : 'споров нет'}</small></div>
    </div>
  );
  const op = ({ x, l }: { x: Transfer; l?: ReturnType<typeof lessonById> }) => {
    let icon: IconName = 'clock';
    let tone = '';
    let status: React.ReactNode;
    if (x.status === 'disputed') {
      icon = 'help'; tone = 'mute';
      const dp = l && d.disputes.find(q => q.lessonId === l.id && q.status === 'open');
      status = <div className="row"><Btn size="s" v="tinted" icon="help" to={dp ? `/tutor/disputes/${dp.id}` : '/tutor/lessons'}>В споре</Btn>{dp && <span className="small">{`решение до ${fmtDay(dp.decideBy, tz)}`}</span>}</div>;
    } else if (x.status === 'failed') {
      icon = 'warn'; tone = 'bad';
      status = <div className="row"><St tone="bad" icon="warn">Ошибка перевода</St><span className="small">{x.failReason ?? 'банк отклонил перевод'}</span></div>;
    } else if (x.status === 'sent') {
      icon = 'check'; tone = 'ok';
      status = <div className="row"><St tone="ok" icon="check">Переведено</St><span className="small">{x.sentAt ? fmtDayTime(x.sentAt, tz) : ''}{x.reason ? ` · ${x.reason.toLowerCase()}` : l?.studentAnswer?.ok ? ' · ученик подтвердил' : ' · через 24 ч после урока'}</span></div>;
    } else {
      const future = l && l.start > at;
      status = <div className="row"><St tone={future ? 'neutral' : 'action'} icon="clock">{future ? 'Заморожено' : 'Ждёт перевода'}</St><span className="small">{future ? 'после урока' : `не позже ${fmtDayTime(x.dueAt, tz)}`}</span></div>;
    }
    return (
      <div className="r8-op" key={x.id}>
        <span className={`r8-ic${tone ? ` r8-ic--${tone}` : ''}`}><Icon name={icon} /></span>
        <b className="r8-tt">{l ? `${l.participant.name} · ${fmtDay(l.start, tz)}` : 'Урок'}</b>
        <span className="r8-amt">{fmtMoney(x.amount)}</span>
        <span className="r8-sub">{l ? `${l.subject}, ${l.minutes} мин` : ''}</span>
        <div className="r8-x">{status}</div>
      </div>
    );
  };
  const failAlert = failed && <Alert tone="bad" icon="warn" title={`Перевод ${fmtMoney(failed.x.amount)} не прошёл`} style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/payouts/setup">Изменить карту</Btn>}>{`${payout ? `Карта •• ${payout.card.slice(-4)}: ` : ''}${failed.x.failReason ?? 'банк отклонил перевод'}. Укажите другую, и мы переведём снова.`}</Alert>;
  const setupAlert = !payout && <Alert tone="action" icon="wallet" title="Укажите, куда переводить деньги" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/payouts/setup">Настроить</Btn>}>Выплаты приходят самозанятым и ИП. Заполните один раз перед первой выплатой.</Alert>;
  const monthChip = months.length > 1 && (
    <div className="filter" data-dd-anchor>
      <Chip set={!!month} menu expanded={menu} onClick={() => setMenu(v => !v)}>{month ? monthName(Number(month.slice(5))) : 'Все месяцы'}</Chip>
      <Dropdown open={menu} onClose={() => setMenu(false)} align="right">
        <MenuItem checked={!month} onClick={() => { setMonth(''); setMenu(false); }}>Все месяцы</MenuItem>
        {months.map(m => <MenuItem key={m} checked={month === m} onClick={() => { setMonth(m); setMenu(false); }}>{`${monthName(Number(m.slice(5)))} ${m.slice(0, 4)}`}</MenuItem>)}
      </Dropdown>
    </div>
  );
  const ops = (
    <div className="card" style={{ gap: 4 }}>
      <div className="between"><span className="h3">Переводы</span>{monthChip || <span className="small">{monthName(cur.month)}</span>}</div>
      {list.length ? <div className="r8-ops">{list.map(op)}</div> : <Empty icon="wallet" title="Переводов пока нет" style={{ boxShadow: 'none', maxWidth: 'none' }}>После первого урока здесь появится перевод.</Empty>}
    </div>
  );
  if (phone)
    return (
      <Page title="Финансы" kind="cabinet" tab="Финансы">
        <div className="between"><h1 className="h1">Финансы</h1><IBtn icon="card" label="Реквизиты" to="/tutor/payouts/setup" /></div>
        {setupAlert}{failAlert}{kpis}{ops}
      </Page>
    );
  return (
    <Page title="Финансы" kind="cabinet" side="Финансы">
      <div className="between"><div className="title-block"><h1 className="h1">Финансы</h1><p className="sub">{payoutLine}</p></div><Btn size="m" to="/tutor/payouts/setup">Реквизиты</Btn></div>
      {setupAlert}{failAlert}{kpis}
      <div className="cols c2">
        {ops}
        <div className="card"><div className="h3">Когда приходят деньги</div>
          <Note tone="action" icon="wallet">Каждый урок переводим отдельно: сразу после подтверждения ученика или через 24 ч после урока.</Note>
          <Note icon="shield">Если ученик сообщил о проблеме, деньги ждут решения поддержки, до 3 рабочих дней.</Note>
          <Note icon="doc">Чек в «Моём налоге» формируем сами.</Note>
        </div>
      </div>
    </Page>
  );
}
