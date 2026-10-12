import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Btn, Confirm, Empty, Sheet, St, Timeline, type TimelineItem } from '../../ui/kit';
import { PayMethods, payInput, type PayChoice } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, rules, tutorById } from '../../api';
import type { Lesson } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { instrumental } from '../../lib/names';
import { DAY, HOUR, fmtDay, fmtDayTime, fmtDateShort, weekdayShort } from '../../lib/time';

export default function SeriesManage() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const at = useNow();
  const { run, toast } = useApp();
  const [all, setAll] = useState(false);
  const [cancelAll, setCancelAll] = useState(false);
  const [cancelOne, setCancelOne] = useState<Lesson | null>(null);
  const [payFor, setPayFor] = useState<Lesson | null>(null);
  const [choice, setChoice] = useState<PayChoice>(me.cards[0] ? { kind: 'saved', cardId: me.cards[0].id } : { kind: 'new' });
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const [save, setSave] = useState(true);
  const s = d.series.find(x => x.id === id && x.studentId === me.id);
  if (!s) return <Page title="Серия" back="/my/lessons"><Empty title="Серия не найдена" /></Page>;
  const t = tutorById(d, s.tutorId)!;
  const first = t.name.split(' ')[0];
  const lessons = s.lessonIds.map(x => d.lessons.find(l => l.id === x)).filter(Boolean) as Lesson[];
  const unpaid = lessons.filter(l => l.status === 'unpaid');
  const nextLesson = lessons.find(l => rules.isUpcoming(l, at));
  const days = [...new Set(s.pattern.map(p => weekdayShort(p.weekday)))].join(' и ');
  const time = s.pattern[0] ? `${String(s.pattern[0].hour).padStart(2, '0')}:${String(s.pattern[0].minute).padStart(2, '0')}` : '';

  const rowFor = (l: Lesson) => {
    const ph = rules.phase(l, at);
    let sub = '';
    let right: React.ReactNode = null;
    const payment = d.payments.find(p => p.id === l.paymentId);
    if (s.status === 'pending') {
      sub = l.paymentId ? 'заморожено' : `спишем ${fmtDateShort(l.start - DAY, me.tz)}`;
      right = <St tone="action" icon="clock">Ждёт подтверждения</St>;
    } else if (ph === 'completed') {
      sub = payment ? `списано ${fmtDateShort(payment.createdAt, me.tz)}` : '';
      right = <St tone="neutral" icon="check">Проведён</St>;
    } else if (ph === 'unpaid') {
      sub = `оплатите до ${fmtDayTime(l.start - 4 * HOUR, me.tz)}`;
      right = <Btn v="primary" size="s" onClick={() => setPayFor(l)}>Оплатить</Btn>;
    } else if (ph === 'cancelled' || ph === 'declined' || ph === 'expired') {
      sub = l.cancel?.reason ?? 'отменено';
      right = <St tone="neutral" icon="x">Отменено</St>;
    } else if (ph === 'awaiting' || ph === 'live' || ph === 'disputed') {
      right = <Btn size="s" to={`/my/lessons/${l.id}`}>Открыть</Btn>;
      sub = 'урок прошёл';
    } else {
      sub = l.paymentId ? 'оплачено' : `спишем ${fmtDateShort(l.start - DAY, me.tz)}`;
      right = <Btn size="s" onClick={() => setCancelOne(l)}>Отменить</Btn>;
    }
    return (
      <div className="r4-row" key={l.id}>
        <div className="r4-d"><b>{fmtDay(l.start, me.tz)}</b><span className="small">{nb(sub)}</span></div>
        {right}
      </div>
    );
  };
  const visible = all ? lessons : lessons.slice(0, 6);
  const rows = (
    <section className="card" style={{ gap: 0, padding: '6px 18px' }}>
      {visible.map(rowFor)}
      {lessons.length > 6 && !all && <div className="r4-row"><span className="small" style={{ flex: 1 }}>Ещё {lessons.length - 6} занятия, до {fmtDateShort(lessons[lessons.length - 1].start, me.tz)}</span><Btn size="s" onClick={() => setAll(true)}>Показать</Btn></div>}
    </section>
  );
  const head = (
    <div style={{ display: 'grid', gap: 4 }}>
      <h1 className={phone ? 'h2' : 'h1'}>{days} с {instrumental(first)}</h1>
      <span className="small">{nb(`${s.count} занятий · ${time} · ${fmtMoney(s.studentPrice)} за каждое`)}{s.skippedDates.length ? ` · перенесено в конец: ${s.skippedDates.length}` : ''}</span>
      <div className="row-s" style={{ marginTop: 4 }}>{s.status === 'pending' ? <St tone="action" icon="clock">{`${first} ещё не подтвердил(а)`}</St> : s.status === 'confirmed' ? <St tone="ok" icon="check">Подтверждена</St> : <St tone="neutral" icon="x">{s.status === 'cancelled' ? 'Отменена' : s.status === 'declined' ? 'Отклонена' : 'Не подтверждена вовремя'}</St>}</div>
    </div>
  );
  const fail = unpaid[0] && <Alert tone="bad" icon="warn" title={`Не получилось списать ${fmtMoney(unpaid[0].studentPrice)} за ${fmtDay(unpaid[0].start, me.tz)}`} action={<Btn v="primary" size="s" onClick={() => setPayFor(unpaid[0])}>Оплатить</Btn>}>{`Оплатите до ${fmtDayTime(unpaid[0].start - 4 * HOUR, me.tz)}, иначе занятие отменится.`}</Alert>;
  const tl: TimelineItem[] = [
    { state: 'done', title: 'Серия отправлена', text: fmtDayTime(s.createdAt, me.tz) },
    { state: s.status === 'pending' ? 'cur' : 'done', title: s.status === 'pending' ? `${first} подтверждает` : 'Серия подтверждена', text: s.status === 'pending' ? `До ${fmtDayTime(s.confirmDeadline, me.tz)}` : undefined },
    { state: 'todo', title: 'Списание за каждое занятие', text: 'За 24 часа до начала, с сохранённой карты' },
  ];
  const actions = s.status === 'pending' || s.status === 'confirmed' ? (
    <div style={{ display: 'grid', gap: 8 }}>
      {nextLesson && <Btn block to={`/my/lessons/${nextLesson.id}`}>Открыть ближайшее занятие</Btn>}
      <Btn v="danger" block onClick={() => setCancelAll(true)}>Отменить всю серию</Btn>
    </div>
  ) : null;
  const modals = (
    <>
      <Confirm open={cancelAll} title="Отменить всю серию?" text="Будущие занятия отменятся. Оплаченные раньше чем за 4 часа вернём на карту, остальные просто не спишутся." confirm="Отменить серию" danger onClose={() => setCancelAll(false)} onConfirm={() => { setCancelAll(false); run(() => booking.cancelSeries(s.id), 'Серия отменена'); }} />
      <Confirm open={!!cancelOne} title="Отменить занятие?" text={cancelOne ? (rules.canCancelFree(cancelOne, at) ? `${fmtDayTime(cancelOne.start, me.tz)}. Отмена бесплатная, остальные занятия серии останутся.` : `${fmtDayTime(cancelOne.start, me.tz)}. До начала меньше 4 часов: ${fmtMoney(cancelOne.studentPrice)} получит ${first}.`) : ''} confirm="Отменить занятие" danger onClose={() => setCancelOne(null)} onConfirm={() => { const l = cancelOne!; setCancelOne(null); run(() => booking.cancelByStudent(l.id, 'Отмена занятия серии'), 'Занятие отменено'); }} />
      <Sheet open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `Оплатить ${fmtDay(payFor.start, me.tz)}` : ''}>
        {payFor && (
          <>
            <p className="sub" style={{ marginTop: -4 }}>{nb(`${fmtMoney(payFor.studentPrice)} спишем сразу.`)}</p>
            <PayMethods me={me} value={choice} onChange={setChoice} card={card} setCard={setCard} save={save} setSave={setSave} />
            <Btn v="primary" block onClick={() => { const l = payFor; const ok = run(() => { booking.payUnpaid(l.id, payInput(choice, card, save)); return true; }); if (ok) { setPayFor(null); toast('Занятие оплачено', { tone: 'ok' }); } }}>{`Оплатить ${fmtMoney(payFor.studentPrice)}`}</Btn>
          </>
        )}
      </Sheet>
    </>
  );
  if (phone)
    return (
      <Page title="Серия" back="/my/lessons">
        {fail}{head}{rows}{actions}{modals}
      </Page>
    );
  return (
    <Page title="Серия" kind="cabinet" side="Мои уроки">
      {head}{fail}
      <div className="cols c2">{rows}<div className="stack">{<section className="card"><h3 className="h3">Оплата серии</h3><Timeline items={tl} flat /></section>}{actions}</div></div>
      {modals}
    </Page>
  );
}
