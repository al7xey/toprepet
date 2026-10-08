import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Page, ActionBar } from '../../ui/layout';
import { Btn, Empty, Kv, Note, Options, Seg } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { PayMethods, Person, WhoPicker, payInput, type PayChoice } from '../../ui/domain';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, tutorBySlug, booking, schedule, ApiError } from '../../api';
import { fmtMoney, studentPrice } from '../../lib/money';
import { dative, genitive, instrumental } from '../../lib/names';
import { fmtDateShort, fmtDay, fmtTime, weekdayShort, zoned, NB } from '../../lib/time';

/* Regular lessons: weekdays and time once, the tutor confirms the whole series, each lesson is charged 24 h before. */
export default function SeriesNew() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { toast } = useApp();
  const t = tutorBySlug(d, slug);
  const subjects = t ? t.subjects.filter(s => t.prices.some(p => p.subject === s.subject)).map(s => s.subject) : [];
  const [subject, setSubject] = useState(sp.get('subject') && subjects.includes(sp.get('subject')!) ? sp.get('subject')! : subjects[0] ?? '');
  const durations = t ? t.prices.filter(p => p.subject === subject) : [];
  const [minutes, setMinutes] = useState(Number(sp.get('minutes')) || durations.find(p => p.minutes === 60)?.minutes || durations[0]?.minutes || 60);
  const [count, setCount] = useState(8);
  const [who, setWho] = useState('self');
  const [pattern, setPattern] = useState<booking.SeriesPattern[]>([]);
  const [adding, setAdding] = useState(false);
  const [choice, setChoice] = useState<PayChoice>(me.cards[0] ? { kind: 'saved', cardId: me.cards[0].id } : { kind: 'new' });
  const [card, setCard] = useState({ number: '', exp: '', cvc: '' });
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);

  /* weekly times the tutor usually has free, in the student's zone */
  const options = useMemo(() => {
    if (!t) return [] as { weekday: number; hour: number; minute: number }[];
    const free = schedule.freeSlots(d, t, { minutes, ignoreHorizon: true, untilDays: 21, forStudentId: me.id });
    const seen = new Map<string, { weekday: number; hour: number; minute: number }>();
    for (const s of free) {
      const p = zoned(s, me.tz);
      const k = `${p.weekday}-${p.hour}-${p.minute}`;
      if (!seen.has(k)) seen.set(k, { weekday: p.weekday, hour: p.hour, minute: p.minute });
    }
    return [...seen.values()].sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
  }, [d, t, minutes, me.tz, me.id]);

  if (!t) return <Page title="Регулярные занятия" back="/teachers"><Empty title="Анкета не найдена" /></Page>;
  const first = t.name.split(' ')[0];
  const price = durations.find(p => p.minutes === minutes)?.price ?? 0;
  const each = studentPrice(price);
  const plan = pattern.length ? booking.planSeries(t.userId, minutes, pattern, count, me.tz) : { dates: [], skipped: [] };
  const label = (p: booking.SeriesPattern) => `${weekdayShort(p.weekday)} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  const key = (p: booking.SeriesPattern) => `${p.weekday}-${p.hour}-${p.minute}`;
  const sampleTutorTime = plan.dates[0] ? fmtTime(plan.dates[0], t.tz) : '';

  const send = () => {
    setBusy(true);
    try {
      const s = booking.createSeries({ tutorId: t.userId, subject, minutes, pattern, count, participant: booking.participantFor(me, who), method: payInput(choice, card, save) });
      toast(`Серия отправлена ${first}`, { tone: 'ok' });
      navigate(`/my/series/${s.id}`, { replace: true });
    } catch (e) {
      toast(e instanceof ApiError || e instanceof Error ? e.message : 'Не получилось', { tone: 'bad' });
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <section className="card">
      <Person name={t.name} sub={`${subject.replace(/ язык$/, '')} · ${minutes} мин · ${fmtMoney(each)}`} tone={t.tone} src={t.photo} />
      {subjects.length > 1 && <Options legend="Предмет" options={subjects} value={subject} onChange={setSubject} />}
      {durations.length > 1 && <Options legend="Длительность" options={durations.map(p => ({ value: String(p.minutes), label: `${p.minutes} мин`, small: fmtMoney(studentPrice(p.price)) }))} value={String(minutes)} onChange={v => { setMinutes(Number(v)); setPattern([]); }} />}
      <div style={{ display: 'grid', gap: 10 }}>
        <h3 className="h3">Дни и время</h3>
        <div className="chip-row">
          {pattern.map(p => <button key={key(p)} className="chip is-set" type="button" onClick={() => setPattern(pattern.filter(x => key(x) !== key(p)))} aria-label={`Убрать ${label(p)}`}>{label(p)}<Icon name="x" /></button>)}
          <button className="chip r4-add" type="button" aria-expanded={adding} onClick={() => setAdding(a => !a)}><Icon name="plus" />День</button>
        </div>
        {adding && (
          options.length ? (
            <div className="card flat" style={{ background: 'var(--bg)', gap: 8 }}>
              <span className="small">Обычно свободно у {genitive(first)}, по вашему времени:</span>
              <div className="r5-slots">
                {options.map(o => <button key={key(o)} type="button" className="slot r5-slot" aria-pressed={pattern.some(p => key(p) === key(o))} onClick={() => { setPattern(pattern.some(p => key(p) === key(o)) ? pattern.filter(p => key(p) !== key(o)) : [...pattern, o]); }}><small>{weekdayShort(o.weekday)}</small>{`${String(o.hour).padStart(2, '0')}:${String(o.minute).padStart(2, '0')}`}</button>)}
              </div>
              <Btn size="s" onClick={() => setAdding(false)} style={{ justifySelf: 'start' }}>Готово</Btn>
            </div>
          ) : <Note icon="cal">В ближайшие 3 недели свободных окон нет.</Note>
        )}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <h3 className="h3">Сколько занятий</h3>
        <Seg items={[4, 8, 12].map(n => ({ value: n, label: String(n) }))} value={count} onChange={setCount} />
      </div>
      <WhoPicker me={me} value={who} onChange={setWho} />
      {sampleTutorTime && me.tz !== t.tz && <span className="tz"><Icon name="globe" />Время ваше, у {genitive(first)} будет {sampleTutorTime}</span>}
    </section>
  );
  const summary = (
    <section className="card">
      <h3 className="h3">Как будет</h3>
      {plan.dates.length ? (
        <>
          <Kv rows={[['Первое занятие', fmtDay(plan.dates[0], me.tz)], ['Последнее', fmtDay(plan.dates[plan.dates.length - 1], me.tz)], ['Каждое занятие', fmtMoney(each)], ['Сейчас заморозим', fmtMoney(each)]]} />
          {plan.dates.length < count && <Note tone="bad" icon="warn">{`Нашлось только ${plan.dates.length} свободных окон. Добавьте ещё день или уменьшите число занятий.`}</Note>}
          {plan.skipped.length > 0 && <Note tone="action" icon="cal">{`${plan.skipped.map(s => fmtDateShort(s, me.tz)).join(', ')} у ${genitive(first)} занято или выходной. Эти занятия перенесём в конец серии.`}</Note>}
          <Note icon="card">Каждое занятие спишем с карты за 24 часа до начала и пришлём уведомление. Сейчас замораживаем только первое.</Note>
        </>
      ) : <p className="small">Выберите дни и время, и мы покажем даты занятий.</p>}
    </section>
  );
  const pay = <section className="card"><h3 className="h3">Карта для списаний</h3><PayMethods me={me} value={choice} onChange={setChoice} card={card} setCard={setCard} save={save} setSave={setSave} noSbp /></section>;
  const ready = plan.dates.length >= count && pattern.length > 0;

  if (phone)
    return (
      <Page title="Регулярные занятия" back={`/teachers/${t.slug}/book`} bottom={<ActionBar><Btn v="primary" onClick={send} loading={busy} disabled={!ready}>{`Отправить ${dative(first)}`}</Btn></ActionBar>}>
        {form}{summary}{pay}
      </Page>
    );
  return (
    <Page title="Регулярные занятия">
      <div className="title-block"><h1 className="h1">Регулярные занятия с {instrumental(first)}</h1><p className="sub">Одна запись на всю серию. {first} подтвердит её один раз.</p></div>
      <div className="cols c2">
        <div className="stack">{form}{summary}{pay}</div>
        <aside className="summary" style={{ position: 'sticky', top: 90 }}>
          <h4>Ваша серия</h4>
          <dl>
            <div><dt>Расписание</dt><dd>{pattern.length ? pattern.map(label).join(', ') : <span className="muted">Не выбрано</span>}</dd></div>
            <div><dt>Занятий</dt><dd>{count} по {minutes}{NB}мин</dd></div>
            <div><dt>Каждое</dt><dd>{fmtMoney(each)}</dd></div>
          </dl>
          <div className="total"><span>Сейчас заморозим</span><b>{fmtMoney(each)}</b></div>
          <Btn v="primary" block onClick={send} loading={busy} disabled={!ready}>Отправить {dative(first)}</Btn>
          <span className="hint">Остальные занятия спишем по одному, за 24 часа до начала. Пакетов со скидкой пока нет.</span>
        </aside>
      </div>
    </Page>
  );
}
