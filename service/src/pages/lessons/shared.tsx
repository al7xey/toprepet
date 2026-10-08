import { useState } from 'react';
import { Btn, Kv, Sheet, Timeline, type TimelineItem } from '../../ui/kit';
import { useDb } from '../../api';
import type { Lesson, Payment } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { fmtDayTime, fmtDateShort, now } from '../../lib/time';

export function paymentOf(d: ReturnType<typeof useDb>, l: Lesson): Payment | undefined {
  return d.payments.find(p => p.id === l.paymentId);
}

const methodLabel = (p: Payment) => (p.method.kind === 'sbp' ? 'СБП' : `Карта •• ${p.method.last4}`);

export function paymentStatus(p: Payment | undefined, tz: string) {
  if (!p) return 'Нет';
  const last = p.events[p.events.length - 1];
  switch (p.status) {
    case 'held':
      return `Заморожен ${fmtDateShort(p.events[0].at, tz)}`;
    case 'charged':
      return `Списан ${fmtDayTime(p.events.find(e => e.type === 'charge')?.at ?? p.createdAt, tz)}`;
    case 'released':
      return 'Заморозка снята';
    case 'refunded':
      return `Возвращён ${fmtDateShort(last.at, tz)}`;
    case 'partial_refund':
      return `Частично возвращён ${fmtDateShort(last.at, tz)}`;
    default:
      return p.status;
  }
}

/* «Оплата» card with the receipt */
export function PaymentCard({ l, tz, lessonState }: { l: Lesson; tz: string; lessonState: string }) {
  const d = useDb();
  const p = paymentOf(d, l);
  const [receipt, setReceipt] = useState(false);
  const charged = p && ['charged', 'refunded', 'partial_refund'].includes(p.status);
  return (
    <section className="card">
      <div className="between"><h3 className="h3">Оплата</h3>{charged && <Btn size="s" icon="doc" onClick={() => setReceipt(true)}>Чек</Btn>}</div>
      <Kv rows={[
        ['Стоимость', l.kind === 'intro' ? 'бесплатно' : fmtMoney(l.studentPrice)],
        ...(l.discount ? [['Промокод', `−${fmtMoney(l.discount)}`] as [string, string]] : []),
        ['Оплачено', p && p.status !== 'released' && p.status !== 'held' ? fmtMoney(p.amount) : '0 ₽'],
        ...(p ? [['Способ', methodLabel(p)] as [string, string]] : []),
        ['Платёж', l.kind === 'intro' ? 'Не нужен' : paymentStatus(p, tz)],
        ['Занятие', lessonState],
        ['Возврат', p?.refunded ? `${fmtMoney(p.refunded)} на ${methodLabel(p)}, 1–5 рабочих дней` : p?.status === 'released' ? 'Деньги не списывались' : 'Нет'],
      ]} />
      {p && <Receipt open={receipt} onClose={() => setReceipt(false)} p={p} l={l} tz={tz} />}
    </section>
  );
}

function Receipt({ open, onClose, p, l, tz }: { open: boolean; onClose: () => void; p: Payment; l: Lesson; tz: string }) {
  const d = useDb();
  const tutor = d.tutors.find(t => t.userId === l.tutorId);
  return (
    <Sheet open={open} onClose={onClose} title="Кассовый чек">
      <Kv rows={[
        ['Продавец', 'ООО «ТопРепет», ИНН 7700000000'],
        ['Услуга', `Урок: ${l.subject}, ${l.minutes} мин`],
        ['Исполнитель', tutor?.name ?? ''],
        ['Сумма', fmtMoney(p.amount)],
        ...(p.refunded ? [['Возврат', fmtMoney(p.refunded)] as [string, string]] : []),
        ['Способ', methodLabel(p)],
        ['Дата', fmtDayTime(p.events.find(e => e.type === 'charge')?.at ?? p.createdAt, tz)],
        ['Номер', `№ ${l.number}-${p.id.slice(-4).toUpperCase()}`],
      ]} />
      <Btn block icon="doc" onClick={() => window.print()}>Распечатать</Btn>
    </Sheet>
  );
}

/* «Движение денег» */
export function MoneyTimeline({ l, tz, tutorFirst }: { l: Lesson; tz: string; tutorFirst: string }) {
  const d = useDb();
  const p = paymentOf(d, l);
  const tr = d.transfers.find(t => t.lessonId === l.id);
  if (l.kind === 'intro') return null;
  const items: TimelineItem[] = [];
  const hold = p?.events.find(e => e.type === 'hold');
  const charge = p?.events.find(e => e.type === 'charge');
  const release = p?.events.find(e => e.type === 'release');
  const refund = p?.events.find(e => e.type === 'refund');
  if (hold) items.push({ state: 'done', title: `Заморожено ${fmtMoney(hold.amount)}`, text: `${fmtDayTime(hold.at, tz)}, при записи` });
  if (release) items.push({ state: 'done', title: 'Заморозка снята', text: `${fmtDayTime(release.at, tz)}. ${release.note ?? ''}` });
  if (charge) items.push({ state: 'done', title: 'Списано', text: `${fmtDayTime(charge.at, tz)}${l.seriesId ? '' : `, когда ${tutorFirst} подтвердил(а)`}` });
  else if (!release && !refund) items.push({ state: l.status === 'pending' ? 'cur' : 'todo', title: 'Списание', text: l.seriesId && !p ? `За 24 часа до урока` : `Когда ${tutorFirst} подтвердит запись` });
  if (refund) items.push({ state: 'done', title: `Возврат ${fmtMoney(refund.amount)}`, text: `${fmtDayTime(refund.at, tz)}. Придёт на карту за 1–5 рабочих дней` });
  if (!release && !(refund && p?.status === 'refunded')) {
    items.push({ state: now() > l.end ? 'done' : 'todo', title: 'Урок', text: fmtDayTime(l.start, tz) });
    if (tr) items.push({ state: tr.status === 'sent' ? 'done' : tr.status === 'disputed' ? 'cur' : 'todo', title: tr.status === 'disputed' ? 'Деньги ждут решения поддержки' : `Перевод ${tutorFirst}`, text: tr.status === 'sent' ? fmtDayTime(tr.sentAt!, tz) : 'После урока, когда вы подтвердите, или через 24 часа' });
  }
  return <section className="card"><h3 className="h3">Движение денег</h3><Timeline items={items} flat /></section>;
}
