import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Page, ActionBar } from '../../ui/layout';
import { Alert, Btn, Empty, IBtn, Options, St } from '../../ui/kit';
import { DateStrip, Person, SlotGrid, TzLine, WhoPicker, daysFrom, useSlotPicker } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useDb, useSession, tutorBySlug, tutors as tApi, reviews as rv, schedule, booking } from '../../api';
import { genitive, instrumental } from '../../lib/names';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { fmtDayTime, monthName, parseDateKey, utcLabel, zoneCity, NB } from '../../lib/time';

export function checkoutUrl(slug: string, start: number, minutes: number, subject: string, who: string, responseId?: string) {
  const sp = new URLSearchParams({ tutor: slug, start: String(start), minutes: String(minutes), subject, who });
  if (responseId) sp.set('response', responseId);
  return `/book/checkout?${sp}`;
}

export default function Pick() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const t = tutorBySlug(d, slug);
  const subjects = t ? t.subjects.filter(s => t.prices.some(p => p.subject === s.subject)).map(s => s.subject) : [];
  const [subject, setSubject] = useState(sp.get('subject') && subjects.includes(sp.get('subject')!) ? sp.get('subject')! : subjects[0] ?? '');
  const durations = t ? t.prices.filter(p => p.subject === subject).sort((a, b) => a.minutes - b.minutes) : [];
  const [minutes, setMinutes] = useState(Number(sp.get('minutes')) || durations.find(p => p.minutes === 60)?.minutes || durations[0]?.minutes || 60);
  const [who, setWho] = useState(sp.get('who') ?? 'self');
  const slots = useMemo(() => (t ? schedule.freeSlots(d, t, { minutes, forStudentId: me.id }) : []), [d, t, minutes, me.id]);
  const picker = useSlotPicker(slots, me.tz, Number(sp.get('start')) || null);
  if (!t || !tApi.isListed(t)) return <Page title="Запись" back="/teachers"><Empty title="Анкета недоступна" action={<Btn to="/teachers">Все преподаватели</Btn>} /></Page>;

  const first = t.name.split(' ')[0];
  const r = rv.tutorRating(d, t.userId);
  const price = durations.find(p => p.minutes === minutes)?.price ?? 0;
  const total = studentPrice(price);
  const canIntro = t.intro.enabled && !booking.introUsed(d, me.id, t.userId);
  const days = daysFrom(me.tz, Math.min(t.horizonWeeks * 7 + 1, 22));
  const month = parseDateKey(picker.day).month;
  const go = () => picker.slot && navigate(checkoutUrl(t.slug, picker.slot, minutes, subject, who));
  const whoName = who === 'self' ? me.name.split(' ')[0] : me.children.find(c => c.id === who)?.name ?? '';

  const head = <Person name={t.name} sub={`${subject.replace(/ язык$/, '')}${r.count ? ` · ${rv.fmtRating(r.avg)} · ${r.count} отзывов` : ' · новый преподаватель'}`} tone={t.tone} src={t.photo} />;
  const badges = <div className="row" style={{ gap: 6 }}>{tApi.docsVerified(t) && <St tone="ok" icon="shield">Документы проверены</St>}<St icon="globe">{`${zoneCity(t.tz)}, ${utcLabel(t.tz)}`}</St></div>;
  const subjOpts = subjects.length > 1 && <Options legend="Предмет" options={subjects} value={subject} onChange={v => { setSubject(v); setMinutes(t.prices.find(p => p.subject === v)?.minutes ?? 60); }} />;
  const durOpts = <Options legend="Длительность" options={durations.map(p => ({ value: String(p.minutes), label: `${p.minutes} мин`, small: fmtMoney(studentPrice(p.price)) }))} value={String(minutes)} onChange={v => setMinutes(Number(v))} />;
  const introAlert = canIntro && <Alert tone="action" icon="gift" title={`Бесплатное знакомство, ${t.intro.minutes} мин`} action={<Btn v="white" size="s" to={`/teachers/${t.slug}/intro`}>Выбрать</Btn>}>{`Вы ещё не занимались с ${instrumental(first)}. Без оплаты.`}</Alert>;
  const cal = (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="between"><h3 className="h3">{monthName(month)}</h3><span className="small">записаться можно на {t.horizonWeeks}{NB}нед. вперёд</span></div>
      {slots.length ? (
        <>
          <DateStrip days={days} selected={picker.day} onSelect={picker.setDay} tz={me.tz} available={picker.available} />
          <TzLine viewerTz={me.tz} otherTz={t.tz} otherName={genitive(first)} sample={picker.slot} />
          <SlotGrid slots={picker.byDay.get(picker.day) ?? []} selected={picker.slot} onSelect={picker.setSlot} tz={me.tz} />
        </>
      ) : <Empty icon="cal" title="Свободных окон нет" action={<Btn size="s" to={`/teachers/${t.slug}`}>{`Написать ${first}`}</Btn>}>Репетитор пока не открыл время на ближайшие недели.</Empty>}
    </div>
  );
  const repeat = <Btn icon="repeat" block to={`/teachers/${t.slug}/series?subject=${encodeURIComponent(subject)}&minutes=${minutes}`}>Заниматься регулярно</Btn>;

  if (phone)
    return (
      <Page title={`Запись к ${genitive(first)}`} back={`/teachers/${t.slug}`}
        bottom={<ActionBar meta={picker.slot ? <>{nb(fmtDayTime(picker.slot, me.tz))}<small>{nb(`${minutes} мин · ${fmtMoney(total)}`)}</small></> : <>Время<small>не выбрано</small></>}><Btn v="primary" onClick={go} disabled={!picker.slot}>Продолжить</Btn></ActionBar>}>
        <div className="card">{head}{badges}</div>
        {subjOpts}{durOpts}{introAlert}
        <WhoPicker me={me} value={who} onChange={setWho} />
        {cal}
        {repeat}
      </Page>
    );
  return (
    <Page title={`Запись к ${genitive(first)}`}>
      <div className="title-block"><h1 className="h1">Запись к {genitive(t.name.split(' ')[0])} {t.name.split(' ').slice(1).join(' ')}</h1><p className="sub">Показываем только свободные окна. Окно закрепится за вами сразу после записи.</p></div>
      <div className="cols c2">
        <section className="card" style={{ padding: 24, gap: 22 }}>
          <div className="between">{head}<span style={{ flexShrink: 0 }}>{tApi.docsVerified(t) && <St tone="ok" icon="shield">Документы проверены</St>}</span></div>
          <div className="cols half">{subjOpts || <div />}{durOpts}</div>
          {introAlert}
          <WhoPicker me={me} value={who} onChange={setWho} />
          <div className="divider" />
          {cal}
        </section>
        <aside style={{ display: 'grid', gap: 12, position: 'sticky', top: 90, alignContent: 'start' }}>
          <div className="summary">
            <h4>Ваши занятия</h4>
            <dl>
              <div><dt>Репетитор</dt><dd>{t.name}</dd></div>
              <div><dt>Предмет</dt><dd>{subject.replace(/ язык$/, '')}, {minutes}{NB}мин</dd></div>
              <div><dt>Когда</dt><dd>{picker.slot ? nb(fmtDayTime(picker.slot, me.tz)) : <span className="muted">Не выбрано</span>}</dd></div>
              <div><dt>Занимается</dt><dd>{whoName}</dd></div>
            </dl>
            <div className="total"><span>К оплате</span><b>{fmtMoney(total)}</b></div>
            <Btn v="primary" block onClick={go} disabled={!picker.slot}>Продолжить</Btn>
            <span className="hint">Сейчас только заморозим, спишем после подтверждения.</span>
          </div>
          {repeat}
          <IBtn icon="left" label="Назад к анкете" to={`/teachers/${t.slug}`} className="hide-phone" />
        </aside>
      </div>
    </Page>
  );
}
