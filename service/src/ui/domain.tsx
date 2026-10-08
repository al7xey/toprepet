import { useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Icon, HeartOn, type IconName } from './icons';
import { Ava, Ph, St, cx, Option, TextField, Switch } from './kit';
import { useApp } from './app-state';
import { useDb, useSession, students, tutors as tutorsApi, reviews as rv, sel, rules } from '../api';
import type { Lesson, TutorProfile, User } from '../api/types';
import { fmtMoney, studentPrice } from '../lib/money';
import { nb } from '../lib/text';
import { addDaysKey, dateKey, fmtDayTime, fmtTime, now, parseDateKey, weekdayLower, weekdayOfKey, zonedToUtc, NB } from '../lib/time';

/* ---------- time tokens in system texts ---------- */
export function renderTokens(text: string, tz: string) {
  return nb(text.replace(/\{t:(\d+)\}/g, (_, ts) => fmtDayTime(Number(ts), tz)));
}

/* ---------- favourite heart ---------- */
export function FavButton({ tutor, className = 'fav glass-color', style }: { tutor: TutorProfile; className?: string; style?: CSSProperties }) {
  const me = useSession();
  const { askLogin, run, toast } = useApp();
  const on = !!me?.favorites.includes(tutor.userId);
  if (me && me.role !== 'student') return null;
  const first = tutor.name.split(' ')[0];
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!me) return askLogin(`Войдите, чтобы сохранить ${first} в избранное`, { type: 'fav', tutorId: tutor.userId }, `После входа ${first} сразу появится в избранном.`);
    const added = run(() => students.toggleFavorite(tutor.userId));
    if (added !== undefined) toast(added ? `${tutor.name} в избранном` : `${tutor.name} убран(а) из избранного`, { tone: 'ok' });
  };
  return (
    <button className={className} style={style} type="button" aria-label={`${on ? 'Убрать из избранного' : 'В избранное'}: ${tutor.name}`} aria-pressed={on} onClick={click}>
      {on ? <HeartOn /> : <Icon name="heart" />}
    </button>
  );
}

/* ---------- teacher card (4:5 photo + glass plate) ---------- */
export function TeacherCard({ item, to, hideFav, subject }: { item: sel.CatalogItem; to?: string; hideFav?: boolean; subject?: string }) {
  const t = item.tutor;
  const isNew = item.reviews === 0;
  const subj = subject ? subject.replace(/ язык$/, '') : sel.cardSubjects(t);
  return (
    <div className="tcard-wrap">
      <Link className={`tcard ph ph-${t.tone}`} to={to ?? `/teachers/${t.slug}`} aria-label={`${t.name}, ${subj}, от ${fmtMoney(item.price)}`}>
        {t.photo ? <img className="ph-img" src={t.photo} alt="" loading="lazy" decoding="async" /> : <svg className="ph-person" viewBox="0 0 200 220" aria-hidden="true"><use href="#i-person" /></svg>}
        <span className="tplate glass" aria-hidden="true">
          <span className="subj">{subj}</span>
          <span className="meta">{t.name.split(' ')[0]}{!isNew && <> <Icon name="star" />{rv.fmtRating(item.rating)}</>}</span>
          <span className="price">от {fmtMoney(item.price)}</span>
        </span>
      </Link>
      {!hideFav && <FavButton tutor={t} />}
    </div>
  );
}

export function TeacherGrid({ items, subject }: { items: sel.CatalogItem[]; subject?: string }) {
  return <div className="tgrid">{items.map(i => <TeacherCard key={i.tutor.userId} item={i} subject={subject} />)}</div>;
}

export function catalogItem(d: ReturnType<typeof useDb>, t: TutorProfile): sel.CatalogItem {
  const r = rv.tutorRating(d, t.userId);
  return { tutor: t, price: studentPrice(tutorsApi.priceFrom(t)), rating: r.avg, reviews: r.count, docs: tutorsApi.docsVerified(t), score: 0 };
}

/* ---------- person line ---------- */
export function Person({ name, sub, tone, src, size, right }: { name: ReactNode; sub?: ReactNode; tone: User['tone']; src?: string; size?: 'l'; right?: ReactNode }) {
  const body = (
    <div className="person">
      <Ava tone={tone} src={src} size={size} />
      <div><b>{name}</b>{sub && <span>{typeof sub === 'string' ? nb(sub) : sub}</span>}</div>
    </div>
  );
  return right ? <div className="between">{body}{right}</div> : body;
}

/* ---------- lesson status capsules ---------- */
export function lessonStatus(l: Lesson, viewer: 'student' | 'tutor', at = now()): ReactNode[] {
  const ph = rules.phase(l, at);
  const out: ReactNode[] = [];
  const paid = l.paymentId && l.kind === 'lesson';
  switch (ph) {
    case 'pending':
      out.push(<St key="s" tone="action" icon="clock">{viewer === 'tutor' ? 'Ждёт вашего ответа' : 'Ждём подтверждения'}</St>);
      break;
    case 'unpaid':
      out.push(<St key="s" tone="bad" icon="warn">Не оплачен</St>);
      break;
    case 'upcoming':
      out.push(<St key="s" tone="ok" icon="check">Подтверждён</St>);
      if (paid) out.push(<St key="p" tone="ok" icon="card">Оплачено</St>);
      if (l.kind === 'intro') out.push(<St key="i" tone="neutral" icon="gift">Бесплатно</St>);
      break;
    case 'live':
      out.push(<St key="s" tone="ok" icon="video">Идёт</St>);
      break;
    case 'awaiting':
      out.push(<St key="s" tone="action" icon="help">{viewer === 'student' ? 'Урок состоялся?' : 'Ждёт ответа ученика'}</St>);
      break;
    case 'completed':
      out.push(<St key="s" tone="neutral" icon="check">{l.kind === 'intro' ? 'Прошло' : 'Проведён'}</St>);
      break;
    case 'no_show':
      out.push(<St key="s" tone="bad" icon="warn">Неявка ученика</St>);
      break;
    case 'disputed':
      out.push(<St key="s" tone="bad" icon="help">Спор</St>);
      break;
    case 'declined':
      out.push(<St key="s" tone="bad" icon="x">Отклонено</St>);
      break;
    case 'expired':
      out.push(<St key="s" tone="neutral" icon="clock">Не подтверждено</St>);
      break;
    case 'cancelled':
      out.push(<St key="s" tone="neutral" icon="x">{l.cancel?.refund && l.paymentId ? 'Отменён, деньги вернули' : 'Отменён'}</St>);
      break;
  }
  if (l.reschedule?.status === 'pending') out.push(<St key="r" tone="action" icon="repeat">Перенос</St>);
  if (l.seriesId && ph === 'upcoming' && !l.paymentId) out.push(<St key="sr" tone="neutral" icon="repeat">Серия</St>);
  return out;
}

/* ---------- lesson card from the kit ---------- */
export function LessonCard({ when, sub, status, person, facts, note, actions, className, to }: {
  when: string; sub?: string; status?: ReactNode; person: ReactNode; facts?: [IconName, string][]; note?: ReactNode; actions?: ReactNode; className?: string; to?: string;
}) {
  return (
    <article className={cx('lesson', 'r7-w', className)}>
      <div className="lesson-top">
        <div className="lesson-when">{to ? <Link to={to} style={{ textDecoration: 'none' }}><b>{nb(when)}</b></Link> : <b>{nb(when)}</b>}<span>{sub && nb(sub)}</span></div>
        <div className="lesson-st">{status}</div>
      </div>
      {person}
      {facts && facts.length > 0 && <div className="facts">{facts.map(([i, t], k) => <span key={k}><Icon name={i} />{nb(t)}</span>)}</div>}
      {note}
      {actions && <div className="lesson-actions">{actions}</div>}
    </article>
  );
}

/* row in a lessons list */
export function LessonRow({ to, tone, src, when, who, status }: { to: string; tone: User['tone']; src?: string; when: string; who: string; status: ReactNode }) {
  return (
    <Link className="r7-li" to={to}>
      <Ava tone={tone} src={src} />
      <span className="t"><b>{nb(when)}</b><small>{nb(who)}</small>{status}</span>
      <Icon name="right" />
    </Link>
  );
}

/* ---------- date strip and slot grid ---------- */
export function DateStrip({ days, selected, onSelect, tz, available }: { days: string[]; selected: string; onSelect: (k: string) => void; tz: string; available: Set<string> }) {
  const today = dateKey(now(), tz);
  return (
    <div className="dates" role="group" aria-label="Дата">
      {days.map(k => {
        const has = available.has(k);
        const { day } = parseDateKey(k);
        return (
          <button key={k} type="button" className={cx('date', k === today && 'today')} disabled={!has} aria-pressed={has ? k === selected : undefined} onClick={() => onSelect(k)} aria-label={`${weekdayLower(weekdayOfKey(k))} ${day}${has ? '' : ', нет окон'}`}>
            <small>{weekdayLower(weekdayOfKey(k))}</small>
            <b>{day}</b>
            <i className={has ? undefined : 'no'} />
          </button>
        );
      })}
    </div>
  );
}

export function SlotGrid({ slots, selected, onSelect, tz, className, multi }: { slots: number[]; selected: number[] | number | null; onSelect: (s: number) => void; tz: string; className?: string; multi?: boolean }) {
  const isSel = (s: number) => (Array.isArray(selected) ? selected.includes(s) : selected === s);
  if (!slots.length) return <p className="small">В этот день свободных окон нет.</p>;
  return (
    <div className={cx('slots', className)} role="group" aria-label="Время">
      {slots.map(s => <button key={s} className="slot" type="button" aria-pressed={isSel(s)} onClick={() => onSelect(s)}>{fmtTime(s, tz)}</button>)}
      {multi && null}
    </div>
  );
}

/* the next N calendar days in a zone, starting today */
export function daysFrom(tz: string, n: number, offset = 0) {
  const start = dateKey(now(), tz);
  return Array.from({ length: n }, (_, i) => addDaysKey(start, i + offset));
}

/* free slots grouped by the viewer's date */
export function useSlotPicker(slots: number[], tz: string, initial?: number | null) {
  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of slots) {
      const k = dateKey(s, tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [slots, tz]);
  const firstDay = initial ? dateKey(initial, tz) : [...byDay.keys()][0] ?? dateKey(now(), tz);
  const [day, setDay] = useState(firstDay);
  const [slot, setSlot] = useState<number | null>(initial ?? null);
  const activeDay = byDay.has(day) ? day : [...byDay.keys()][0] ?? day;
  return { byDay, day: activeDay, setDay: (k: string) => { setDay(k); setSlot(null); }, slot: slot && slots.includes(slot) ? slot : null, setSlot, available: new Set(byDay.keys()) };
}

/* ---------- time zone line ---------- */
export function TzLine({ viewerTz, otherTz, otherName, sample }: { viewerTz: string; otherTz: string; otherName: string; sample?: number | null }) {
  const same = viewerTz === otherTz || new Date().toLocaleString('en', { timeZone: viewerTz }) === new Date().toLocaleString('en', { timeZone: otherTz });
  const city = viewerTz === 'Europe/Moscow' ? 'Время московское' : `Время ваше, ${zoneCityLower(viewerTz)}`;
  return (
    <span className="tz"><Icon name="globe" />{nb(same ? `${city}, как у ${otherName}` : sample ? `${city}. У ${otherName} будет ${fmtTime(sample, otherTz)}` : `${city}. У ${otherName} ${mskDiffLabel(otherTz)}`)}</span>
  );
}

import { mskDiffLabel, zoneCity } from '../lib/time';
const zoneCityLower = (tz: string) => zoneCity(tz);

/* ---------- payment method picker ---------- */
export type PayChoice = { kind: 'saved'; cardId: string } | { kind: 'new' } | { kind: 'sbp' };

export function PayMethods({ me, value, onChange, card, setCard, save, setSave, noSbp, errors }: {
  me: User; value: PayChoice; onChange: (v: PayChoice) => void; card: { number: string; exp: string; cvc: string }; setCard: (c: { number: string; exp: string; cvc: string }) => void;
  save: boolean; setSave: (v: boolean) => void; noSbp?: boolean; errors?: Partial<Record<'number' | 'exp' | 'cvc', string>>;
}) {
  const name = 'pay';
  const fmtNum = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="list" role="radiogroup" aria-label="Способ оплаты" style={{ maxWidth: 'none', boxShadow: '0 0 0 .5px var(--sep)' }}>
        {me.cards.map(c => (
          <label key={c.id} className="li">
            <input type="radio" name={name} checked={value.kind === 'saved' && value.cardId === c.id} onChange={() => onChange({ kind: 'saved', cardId: c.id })} />
            <span className="r4-ic"><Icon name="card" /></span>
            <span className="t"><b>Карта •• {c.last4}</b><span>Сохранена, {c.brand}</span></span>
            <span className="mark"><Icon name="check" /></span>
          </label>
        ))}
        <label className="li">
          <input type="radio" name={name} checked={value.kind === 'new'} onChange={() => onChange({ kind: 'new' })} />
          <span className="r4-ic"><Icon name="plus" /></span>
          <span className="t"><b>Новая карта</b><span>Можно сохранить для новых уроков</span></span>
          <span className="mark"><Icon name="check" /></span>
        </label>
        {!noSbp && (
          <label className="li">
            <input type="radio" name={name} checked={value.kind === 'sbp'} onChange={() => onChange({ kind: 'sbp' })} />
            <span className="r4-ic"><Icon name="wallet" /></span>
            <span className="t"><b>СБП</b><span>Через приложение банка</span></span>
            <span className="mark"><Icon name="check" /></span>
          </label>
        )}
      </div>
      {value.kind === 'new' && (
        <div className="stack-s">
          <TextField label="Номер карты" value={card.number} onChange={v => setCard({ ...card, number: fmtNum(v) })} inputMode="numeric" autoComplete="cc-number" placeholder="2200 0000 0000 0000" error={errors?.number} />
          <div className="cols half" style={{ gap: 8, gridTemplateColumns: '1fr 1fr' }}>
            <TextField label="Срок" value={card.exp} onChange={v => setCard({ ...card, exp: fmtExp(v) })} inputMode="numeric" autoComplete="cc-exp" placeholder="ММ/ГГ" error={errors?.exp} />
            <TextField label="CVC" value={card.cvc} onChange={v => setCard({ ...card, cvc: v.replace(/\D/g, '').slice(0, 3) })} inputMode="numeric" autoComplete="cc-csc" placeholder="123" type="password" error={errors?.cvc} />
          </div>
          <label className="between" style={{ cursor: 'pointer', padding: '2px 4px' }}><span className="small" style={{ color: 'var(--ink)', fontWeight: 650 }}>Сохранить карту для новых уроков</span><Switch checked={save} onChange={setSave} label="Сохранить карту" /></label>
          <span className="small">Тестовые карты: 2200 0000 0000 0004 — успешно, оканчивающаяся на 0002 — банк отклонит.</span>
        </div>
      )}
    </div>
  );
}

export function payInput(choice: PayChoice, card: { number: string; exp: string; cvc: string }, save: boolean) {
  if (choice.kind === 'saved') return { kind: 'saved' as const, cardId: choice.cardId };
  if (choice.kind === 'sbp') return { kind: 'sbp' as const };
  return { kind: 'new' as const, card, save };
}

/* ---------- misc ---------- */
export function Price({ value }: { value: number }) {
  return <b className="money">{fmtMoney(value)}</b>;
}

export function WhoPicker({ me, value, onChange }: { me: User; value: string; onChange: (v: string) => void }) {
  if (!me.children.length) return null;
  return (
    <fieldset className="options">
      <legend>Кто занимается</legend>
      <Option name="who" checked={value === 'self'} onChange={() => onChange('self')}>{`Я, ${me.name.split(' ')[0]}`}</Option>
      {me.children.map(c => <Option key={c.id} name="who" checked={value === c.id} onChange={() => onChange(c.id)} small={c.age}>{c.name}</Option>)}
    </fieldset>
  );
}

export function TutorPhoto({ t, className, style, children }: { t: TutorProfile; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return <Ph tone={t.tone} src={t.photo} className={className} style={style} alt={t.name}>{children}</Ph>;
}

export const tzNote = (tz: string) => `${zoneCity(tz)}`;
export { NB, zonedToUtc };
