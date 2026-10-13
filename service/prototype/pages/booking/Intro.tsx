import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Page, ActionBar } from '../../ui/layout';
import { Btn, Empty, Note, St, Textarea } from '../../ui/kit';
import { DateStrip, Person, SlotGrid, TzLine, WhoPicker, daysFrom, useSlotPicker } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutorBySlug, schedule, booking } from '../../api';
import { genitive, instrumental } from '../../lib/names';
import { nb } from '../../lib/text';
import { fmtDayTime, fmtTime, NB } from '../../lib/time';

/* Free intro: one per student–tutor pair, no payment and therefore no no-show protection. */
export default function Intro() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const t = tutorBySlug(d, slug);
  const [comment, setComment] = useState('');
  const [who, setWho] = useState('self');
  const [busy, setBusy] = useState(false);
  const minutes = t?.intro.minutes ?? 20;
  const slots = useMemo(() => (t ? schedule.freeSlots(d, t, { minutes, forStudentId: me.id }) : []), [d, t, minutes, me.id]);
  const picker = useSlotPicker(slots, me.tz, Number(sp.get('start')) || null);
  if (!t) return <Page title="Знакомство" back="/teachers"><Empty title="Анкета не найдена" /></Page>;
  const first = t.name.split(' ')[0];
  if (!t.intro.enabled) return <Page title="Знакомство" back={`/teachers/${t.slug}`}><Empty icon="gift" title="Знакомство недоступно" action={<Btn v="primary" to={`/teachers/${t.slug}/book`}>Записаться на урок</Btn>}>{`${first} не проводит бесплатные знакомства. Можно сразу записаться на урок.`}</Empty></Page>;
  if (booking.introUsed(d, me.id, t.userId)) return <Page title="Знакомство" back={`/teachers/${t.slug}`}><Empty icon="gift" title="Знакомство уже было" action={<Btn v="primary" to={`/teachers/${t.slug}/book`}>Записаться на урок</Btn>}>{`Бесплатное знакомство с ${instrumental(first)} одно. Дальше — обычные уроки.`}</Empty></Page>;

  const submit = () => {
    if (!picker.slot) return toast('Выберите время знакомства');
    setBusy(true);
    const l = run(() => booking.bookLesson({ tutorId: t.userId, start: picker.slot!, minutes, subject: t.subjects[0]?.subject ?? '', kind: 'intro', participant: booking.participantFor(me, who), comment }));
    setBusy(false);
    if (l) {
      toast(`Запись отправлена. ${first} подтвердит её в течение суток.`, { tone: 'ok' });
      navigate(`/my/lessons/${l.id}`, { replace: true });
    }
  };

  const card = (
    <section className="card">
      <div className="row" style={{ gap: 6 }}><St tone="ok" icon="gift">Бесплатно</St><St icon="card">Без заморозки</St></div>
      <Person name={t.name} sub={`${t.subjects.map(s => s.subject.replace(/ язык$/, '')).join(', ')} · знакомство ${minutes} мин`} tone={t.tone} src={t.photo} />
      {picker.slot && <div style={{ display: 'grid', gap: 2 }}><span className="r4-when">{nb(`${fmtDayTime(picker.slot, me.tz)}–${fmtTime(picker.slot + minutes * 60000, me.tz)}`)}</span><span className="small">{me.tz === t.tz ? 'по вашему времени' : `по вашему времени, у ${genitive(first)} ${fmtTime(picker.slot, t.tz)}`}</span></div>}
      <Note tone="action" icon="info">{`Деньги не замораживаем. Обсудите цель, уровень и план. ${first} подтвердит запись в течение суток.`}</Note>
      <WhoPicker me={me} value={who} onChange={setWho} />
      <div className="field" style={{ maxWidth: 'none' }}><label htmlFor="intro-c">Что хотите обсудить</label><Textarea id="intro-c" className="r4-ta" value={comment} onChange={e => setComment(e.target.value)} placeholder="Например: собеседование через месяц, уровень B1" /></div>
    </section>
  );
  const pick = (
    <section className="card">
      <h3 className="h3">Время знакомства</h3>
      {slots.length ? (
        <>
          <DateStrip days={daysFrom(me.tz, Math.min(t.horizonWeeks * 7 + 1, 15))} selected={picker.day} onSelect={picker.setDay} tz={me.tz} available={picker.available} />
          <TzLine viewerTz={me.tz} otherTz={t.tz} otherName={genitive(first)} sample={picker.slot} />
          <SlotGrid slots={picker.byDay.get(picker.day) ?? []} selected={picker.slot} onSelect={picker.setSlot} tz={me.tz} />
        </>
      ) : <Note icon="cal">Свободных окон нет. Напишите репетитору.</Note>}
    </section>
  );
  const rulesNote = <Note icon="warn">{`Знакомство одно с каждым репетитором и не защищено от неявки. Если не сможете прийти, отмените запись, чтобы ${first} не ждал(а).`}</Note>;
  if (phone)
    return (
      <Page title="Знакомство" back={`/teachers/${t.slug}`} bottom={<ActionBar><Btn v="primary" onClick={submit} loading={busy} disabled={!picker.slot}>Записаться на знакомство</Btn></ActionBar>}>
        <h1 className="h2">Бесплатное знакомство</h1>
        {pick}{card}{rulesNote}
      </Page>
    );
  return (
    <Page title="Бесплатное знакомство">
      <div className="title-block"><h1 className="h1">Бесплатное знакомство с {instrumental(first)}</h1><p className="sub">{minutes}{NB}минут, чтобы понять, подходите ли вы друг другу.</p></div>
      <div className="cols c2">
        <div className="stack">{pick}{card}{rulesNote}</div>
        <aside className="summary" style={{ position: 'sticky', top: 90 }}>
          <h4>Ваше знакомство</h4>
          <dl>
            <div><dt>Репетитор</dt><dd>{t.name}</dd></div>
            <div><dt>Когда</dt><dd>{picker.slot ? nb(fmtDayTime(picker.slot, me.tz)) : <span className="muted">Не выбрано</span>}</dd></div>
            <div><dt>Длительность</dt><dd>{minutes}{NB}мин</dd></div>
          </dl>
          <div className="total"><span>К оплате</span><b>0{NB}₽</b></div>
          <Btn v="primary" block onClick={submit} loading={busy} disabled={!picker.slot}>Записаться на знакомство</Btn>
          <span className="hint">{nb(`Карта не нужна. ${first} подтвердит запись в течение 24 часов.`)}</span>
        </aside>
      </div>
    </Page>
  );
}
