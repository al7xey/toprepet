import { useState, type ReactNode } from 'react';
import { Btn, Kv, Sheet, Timeline, type TimelineItem } from '../../ui/kit';
import { useDb } from '../../api';
import type { Dispute, Lesson, Payment } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { NB, fmtDayTime, fmtDateShort, fmtTime, now, weekdayShort, zoned } from '../../lib/time';
import { Icon, type IconName } from '../../ui/icons';
import { nb } from '../../lib/text';
import { dative } from '../../lib/names';

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
    if (tr) items.push({ state: tr.status === 'sent' ? 'done' : tr.status === 'disputed' ? 'cur' : 'todo', title: tr.status === 'disputed' ? 'Деньги ждут решения поддержки' : `Перевод ${dative(tutorFirst)}`, text: tr.status === 'sent' ? fmtDayTime(tr.sentAt!, tz) : 'После урока, когда вы подтвердите, или через 24 часа' });
  }
  return <section className="card"><h3 className="h3">Движение денег</h3><Timeline items={items} flat /></section>;
}

/* ---------- small building blocks shared by the lesson screens ---------- */
export function BackBtn({ to, label }: { to: string; label: string }) {
  return <div><Btn v="white" size="s" icon="left" to={to}>{label}</Btn></div>;
}

export function Rules({ items }: { items: { icon: IconName; text: ReactNode; on?: boolean }[] }) {
  return (
    <ul className="r7-rules">
      {items.map((it, i) => <li key={i} className={it.on ? 'on' : undefined}><Icon name={it.icon} /><span>{typeof it.text === 'string' ? nb(it.text) : it.text}</span></li>)}
    </ul>
  );
}

export function linkService(link?: string) {
  if (!link) return '';
  if (/telemost|yandex/.test(link)) return 'Телемост';
  if (/zoom/.test(link)) return 'Zoom';
  if (/meet\.google/.test(link)) return 'Google Meet';
  return 'Видеозвонок';
}

/* «Сейчас → Новое время» */
export function WasNew({ was, now: next, wasLabel = 'Сейчас', newLabel = 'Новое время' }: { was: string; now: string; wasLabel?: string; newLabel?: string }) {
  return (
    <div className="r7-was">
      <div><small>{wasLabel}</small><b>{nb(was)}</b></div>
      <Icon name="right" />
      <div className="new"><small>{newLabel}</small><b>{nb(next)}</b></div>
    </div>
  );
}

export function ConnectBtn({ l, block }: { l: Lesson; block?: boolean }) {
  if (!l.link) return null;
  return <a className={`btn btn--primary btn--m${block ? ' btn--block' : ''}`} href={l.link} target="_blank" rel="noreferrer"><Icon name="video" />{nb(`Подключиться · ${linkService(l.link)}`)}</a>;
}

export const paidOf = (l: Lesson) => l.studentPrice - l.discount;

/* ---------- screenshots for disputes ---------- */
export type Shot = { name: string; dataUrl?: string };

/* keeps small images inline so they survive in local storage; big files keep only the name */
export function readShot(file: File): Promise<Shot> {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/') || file.size > 600 * 1024) return resolve({ name: file.name });
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, dataUrl: String(r.result) });
    r.onerror = () => resolve({ name: file.name });
    r.readAsDataURL(file);
  });
}

export function ShotList({ shots }: { shots: Shot[] }) {
  if (!shots.length) return null;
  return <div className="r8-shots">{shots.map((s, i) => <span key={i} className="r8-shot" title={s.name} aria-label={`Скриншот ${s.name}`}>{s.dataUrl ? <img src={s.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <Icon name="doc" />}</span>)}</div>;
}

export function ShotsInput({ shots, onChange, hint }: { shots: Shot[]; onChange: (s: Shot[]) => void; hint?: string }) {
  const [err, setErr] = useState('');
  const pick = async (files: FileList | null) => {
    if (!files) return;
    const list = [...files];
    if (list.some(f => f.size > 20 * 1024 * 1024)) return setErr('Файл больше 20 МБ, выберите поменьше');
    setErr('');
    const read = await Promise.all(list.slice(0, 5 - shots.length).map(readShot));
    onChange([...shots, ...read]);
  };
  return (
    <div className="stack-s">
      <div className="r8-shots">
        {shots.map((s, i) => (
          <button key={i} type="button" className="r8-shot" aria-label={`Убрать ${s.name}`} title={`${s.name} — нажмите, чтобы убрать`} onClick={() => onChange(shots.filter((_, k) => k !== i))} style={{ border: 0, cursor: 'pointer' }}>
            {s.dataUrl ? <img src={s.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : <Icon name="doc" />}
          </button>
        ))}
        {shots.length < 5 && (
          <label className="btn btn--gray btn--s upload-label">
            <Icon name="plus" />Скриншот
            <input className="file-input" type="file" accept="image/*,.pdf" multiple onChange={e => { void pick(e.target.files); e.target.value = ''; }} />
          </label>
        )}
        {hint && <span className="small">{nb(hint)}</span>}
      </div>
      {err && <span className="err" role="alert"><Icon name="warn" />{err}</span>}
    </div>
  );
}

/* the course of a dispute, shared by the student and the tutor */
export function disputeSteps(dp: Dispute, l: Lesson, tz: string, viewer: 'student' | 'tutor', studentFirst: string, tutorFirst: string, at: number): TimelineItem[] {
  const p = dp.resolution;
  const answered = !!dp.tutorAnswer;
  const late = !answered && at > dp.tutorDeadline;
  return [
    { state: 'done', title: viewer === 'student' ? 'Вы сообщили о проблеме' : `${studentFirst} сообщил(а) о проблеме`, text: fmtDayTime(dp.createdAt, tz) },
    answered
      ? { state: 'done', title: viewer === 'tutor' ? 'Вы ответили' : `${tutorFirst} ответил(а)`, text: fmtDayTime(dp.tutorAnswer!.at, tz) }
      : viewer === 'tutor' && !p
        ? { state: 'cur', title: 'Ваше объяснение', text: late ? 'Срок прошёл, но ответить ещё можно' : `До ${fmtDayTime(dp.tutorDeadline, tz)}`, icon: 'chat' }
        : { state: p || late ? 'done' : 'cur', title: viewer === 'tutor' ? 'Ваше объяснение' : `${tutorFirst} объясняет`, text: late || p ? 'Ответа не было' : `До ${fmtDayTime(dp.tutorDeadline, tz)}`, icon: p || late ? undefined : 'chat' },
    { state: p ? 'done' : answered || late ? 'cur' : 'todo', title: 'Поддержка решает', text: p ? fmtDayTime(p.at, tz) : `До ${fmtDayTime(dp.decideBy, tz).split(',')[0]}` },
    p
      ? { state: 'done', title: p.kind === 'refund_full' ? 'Полный возврат' : p.kind === 'pay_tutor' ? 'Урок засчитан' : 'Частичный возврат', text: p.kind === 'pay_tutor' ? `Оплата ушла ${viewer === 'tutor' ? 'вам' : 'репетитору'}` : `${fmtMoney(p.refund)} ${viewer === 'student' ? 'вернутся на карту за 1–5 рабочих дней' : 'вернули ученику'}` }
      : { state: 'todo', title: 'Возврат или оплата', text: viewer === 'student' ? 'Возврат придёт на карту, с которой платили' : `Перевод вам или возврат ${dative(l.participant.name)}` },
  ];
}

/* «Чт 16 · 19:00» for slot buttons */
export function slotLabel(ts: number, tz: string) {
  const p = zoned(ts, tz);
  return `${weekdayShort(p.weekday)}${NB}${p.day} · ${fmtTime(ts, tz)}`;
}
