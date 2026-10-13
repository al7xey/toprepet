import { useState } from 'react';
import { Page } from '../../ui/layout';
import { Btn, Chip, Confirm, Dropdown, Empty, MenuItem, Note, St, Timeline } from '../../ui/kit';
import { Icon, type IconName } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, students, lessonById, tutorById } from '../../api';
import type { Payment } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { fmtDay, monthName, zoned } from '../../lib/time';
import { Receipt } from '../lessons/shared';

export default function Payments() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const { run } = useApp();
  const [tutor, setTutor] = useState('');
  const [month, setMonth] = useState('');
  const [menu, setMenu] = useState<'' | 't' | 'm'>('');
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [removeCard, setRemoveCard] = useState('');
  const all = d.payments.filter(p => p.studentId === me.id).sort((a, b) => (b.events[b.events.length - 1]?.at ?? b.createdAt) - (a.events[a.events.length - 1]?.at ?? a.createdAt));
  const monthOf = (p: Payment) => { const z = zoned(p.createdAt, me.tz); return `${z.year}-${String(z.month).padStart(2, '0')}`; };
  const months = [...new Set(all.map(monthOf))];
  const tutors = [...new Set(all.map(p => lessonById(d, p.lessonId)?.tutorId).filter(Boolean))] as string[];
  const list = all.filter(p => (!tutor || lessonById(d, p.lessonId)?.tutorId === tutor) && (!month || monthOf(p) === month));
  const method = (p: Payment) => (p.method.kind === 'sbp' ? 'СБП' : `карту •• ${p.method.last4}`);
  const op = (p: Payment) => {
    const l = lessonById(d, p.lessonId);
    const t = l && tutorById(d, l.tutorId);
    const who = `${l ? fmtDay(l.start, me.tz) : ''} · ${t?.name ?? ''}`;
    const last = p.events[p.events.length - 1];
    let icon: IconName = 'cal';
    let tone = '';
    let title = 'Оплата урока';
    let amt = `−${fmtMoney(p.amount)}`;
    let cls = '';
    let extra: React.ReactNode = null;
    const lessonBtn = l && <Btn size="s" to={`/my/lessons/${l.id}`}>Урок</Btn>;
    if (p.status === 'refunded' || p.status === 'partial_refund') {
      icon = 'repeat'; tone = 'ok'; title = p.status === 'refunded' ? 'Возврат' : 'Частичный возврат'; amt = `+${fmtMoney(p.refunded)}`; cls = 'plus';
      extra = <><div className="row"><St tone="ok" icon="check">Отправлен</St></div><span className="small">{nb(`${last?.note ? `${last.note}. ` : ''}На ${method(p)}, придёт за 1–5 рабочих дней`)}</span><div className="row">{lessonBtn}<Btn size="s" icon="doc" onClick={() => setReceipt(p)}>Чек</Btn></div></>;
    } else if (p.status === 'released') {
      icon = 'shield'; tone = 'mute'; title = 'Заморозка снята'; amt = fmtMoney(p.amount); cls = 'off';
      extra = <span className="small">{nb(`${last?.note ? `${last.note}. ` : ''}Деньги не списывались, банк вернёт доступ к ним за 1–3 дня.`)}</span>;
    } else if (p.status === 'held') {
      icon = 'clock'; title = 'Заморожено'; amt = fmtMoney(p.amount);
      extra = <><span className="small">{nb(`Спишем, когда ${t?.name.split(' ')[0] ?? 'репетитор'} подтвердит урок. Если не подтвердит — заморозка снимется.`)}</span><div className="row">{lessonBtn}</div></>;
    } else if (p.status === 'failed') {
      icon = 'warn'; tone = 'bad'; title = 'Оплата не прошла'; amt = fmtMoney(p.amount); cls = 'off';
      extra = <span className="small">{last?.note ?? 'Банк отклонил платёж'}</span>;
    } else {
      const dp = l?.disputeId && d.disputes.find(x => x.id === l.disputeId && x.status === 'open');
      extra = <>{dp && <div className="row"><Btn size="s" v="tinted" icon="help" to={`/disputes/${dp.id}`}>{`Спор, решение до ${fmtDay(dp.decideBy, me.tz)}`}</Btn></div>}<div className="row">{lessonBtn}<Btn size="s" icon="doc" onClick={() => setReceipt(p)}>Чек</Btn></div></>;
    }
    return (
      <div className="r8-op" key={p.id}>
        <span className={`r8-ic${tone ? ` r8-ic--${tone}` : ''}`}><Icon name={icon} /></span>
        <b className="r8-tt">{title}</b>
        <span className={`r8-amt ${cls}`}>{amt}</span>
        <span className="r8-sub">{nb(who)}</span>
        {extra && <div className="r8-x">{extra}</div>}
      </div>
    );
  };
  const grouped = months.filter(m => list.some(p => monthOf(p) === m)).map(m => (
    <div key={m} style={{ display: 'grid', gap: 4 }}>
      <span className="r8-month" style={{ padding: 0 }}>{monthName(Number(m.slice(5)))}</span>
      <div className="r8-ops">{list.filter(p => monthOf(p) === m).map(op)}</div>
    </div>
  ));
  const body = list.length ? <div className="card" style={{ gap: 6 }}>{grouped}</div> : <Empty icon="card" title="Платежей пока нет" style={{ maxWidth: 'none' }} action={<Btn v="primary" to="/teachers">Найти репетитора</Btn>}>Здесь будут оплаты, заморозки и возвраты по урокам.</Empty>;
  const chips = (
    <div className="r3-chips"><div className="chip-row">
      <span className="filter" data-dd-anchor><Chip set={!!month} menu expanded={menu === 'm'} onClick={() => setMenu(menu === 'm' ? '' : 'm')}>{month ? monthName(Number(month.slice(5))) : 'Все месяцы'}</Chip></span>
      <span className="filter" data-dd-anchor><Chip set={!!tutor} menu expanded={menu === 't'} onClick={() => setMenu(menu === 't' ? '' : 't')}>{tutor ? tutorById(d, tutor)?.name ?? 'Репетитор' : 'Все репетиторы'}</Chip></span>
    </div>
      <Dropdown open={menu === 'm'} onClose={() => setMenu('')} style={{ top: 48 }}>
        <MenuItem checked={!month} onClick={() => { setMonth(''); setMenu(''); }}>Все месяцы</MenuItem>
        {months.map(m => <MenuItem key={m} checked={month === m} onClick={() => { setMonth(m); setMenu(''); }}>{`${monthName(Number(m.slice(5)))} ${m.slice(0, 4)}`}</MenuItem>)}
      </Dropdown>
      <Dropdown open={menu === 't'} onClose={() => setMenu('')} style={{ top: 48 }} align="right">
        <MenuItem checked={!tutor} onClick={() => { setTutor(''); setMenu(''); }}>Все репетиторы</MenuItem>
        {tutors.map(x => <MenuItem key={x} checked={tutor === x} onClick={() => { setTutor(x); setMenu(''); }}>{tutorById(d, x)?.name ?? ''}</MenuItem>)}
      </Dropdown>
    </div>
  );
  const cards = (
    <div className="card">
      <div className="h3">Карта для оплаты</div>
      {me.cards.length ? me.cards.map(c => (
        <div className="r8-op" style={{ padding: 0 }} key={c.id}><span className="r8-ic"><Icon name="card" /></span><b className="r8-tt">{`${c.brand} •• ${c.last4}`}</b><span className="r8-amt"><Btn size="s" v="white" onClick={() => setRemoveCard(c.id)}>Удалить</Btn></span><span className="r8-sub">Сохранена при записи</span></div>
      )) : <span className="small">Сохранённых карт нет. Карту можно сохранить при следующей оплате.</span>}
    </div>
  );
  const how = (
    <div className="card"><div className="h3">Как проходят деньги</div>
      <Timeline flat items={[
        { state: 'done', title: 'Запись', text: 'Сумму замораживаем на карте' },
        { state: 'done', title: 'Репетитор подтвердил', text: 'Списываем стоимость урока' },
        { state: 'cur', icon: 'shield', title: 'Урок прошёл', text: 'Есть 24 ч, чтобы сообщить о проблеме' },
        { state: 'todo', title: 'Отмена или спор', text: 'Возврат на карту, с которой платили' },
      ]} />
    </div>
  );
  const modals = (
    <>
      {receipt && lessonById(d, receipt.lessonId) && <Receipt open onClose={() => setReceipt(null)} p={receipt} l={lessonById(d, receipt.lessonId)!} tz={me.tz} />}
      <Confirm open={!!removeCard} title="Удалить карту?" text="Уже оплаченные уроки и серии не изменятся. Для будущих списаний серии понадобится другая карта." confirm="Удалить карту" danger onClose={() => setRemoveCard('')} onConfirm={() => { run(() => students.removeCard(removeCard), 'Карта удалена'); setRemoveCard(''); }} />
    </>
  );
  if (phone)
    return (
      <Page title="Платежи" back="/account">
        {all.length > 0 && chips}
        {body}
        <Note icon="card">{me.cards[0] ? `Платите картой •• ${me.cards[0].last4}. Возвраты приходят на ту карту, с которой платили.` : 'Возвраты приходят на ту карту, с которой платили.'}</Note>
        {cards}
        {modals}
      </Page>
    );
  return (
    <Page title="Платежи" kind="cabinet" side="Платежи">
      <div className="between"><div className="title-block"><h1 className="h1">Платежи</h1><p className="sub">Оплаты, заморозки и возвраты по всем урокам</p></div>{all.length > 0 && chips}</div>
      <div className="cols c2">
        {body}
        <div className="stack">{cards}{how}</div>
      </div>
      {modals}
    </Page>
  );
}
