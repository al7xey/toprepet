import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Btn, Empty, IBtn, Note, St, Tz, cx } from '../../ui/kit';
import { DateStrip, LessonCard, LessonRow, Person, lessonStatus } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, useSession, rules, schedule, sel, tutorById, userById } from '../../api';
import type { Db, Lesson, User } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { genitive } from '../../lib/names';
import { addDaysKey, dateKey, fmtDay, fmtDayTime, fmtDuration, fmtTime, monthGen, mskDiffLabel, parseDateKey, weekdayLower, weekdayOfKey, zoneCity, zoned } from '../../lib/time';
import { linkService } from './shared';

const SHOWN: Lesson['status'][] = ['pending', 'confirmed', 'unpaid', 'completed', 'no_show', 'disputed'];

export const who = (l: Lesson) => (l.participant.age ? `${l.participant.name}, ${l.participant.age}` : l.participant.name);

/* free hours of the tutor merged into ranges per day, in the viewer's zone */
function freeRanges(d: Db, tutorId: string, tz: string, at: number) {
  const t = tutorById(d, tutorId);
  if (!t) return new Map<string, [number, number][]>();
  const slots = schedule.freeSlots(d, t, { minutes: 60, ignoreHorizon: true, ignoreNotice: true, untilDays: 15, at });
  const map = new Map<string, [number, number][]>();
  for (const s of slots) {
    const k = dateKey(s, tz);
    const list = map.get(k) ?? [];
    const last = list[list.length - 1];
    if (last && last[1] === s) last[1] = s + 3600_000;
    else list.push([s, s + 3600_000]);
    map.set(k, list);
  }
  return map;
}

/* incoming requests: bookings, series and reschedules waiting for the tutor */
export function incomingFor(d: Db, me: User, at: number) {
  const out: { key: string; tone?: 'action'; icon: 'clock' | 'gift' | 'repeat'; title: string; text: string; to: string; deadline: number }[] = [];
  const seen = new Set<string>();
  for (const l of d.lessons.filter(x => x.tutorId === me.id).sort((a, b) => a.confirmDeadline - b.confirmDeadline)) {
    if (l.status === 'pending' && l.confirmDeadline > at) {
      if (l.seriesId) {
        if (seen.has(l.seriesId)) continue;
        seen.add(l.seriesId);
        const s = d.series.find(x => x.id === l.seriesId);
        if (s?.status === 'pending') out.push({ key: s.id, tone: 'action', icon: 'repeat', title: `${who(l)}: серия из ${s.count}`, text: `${l.subject}, ${l.minutes} мин, ${fmtMoney(s.tutorPrice)} за каждое. Осталось ${fmtDuration(s.confirmDeadline - at)} на ответ.`, to: `/tutor/series/${s.id}`, deadline: s.confirmDeadline });
        continue;
      }
      if (l.kind === 'intro') out.push({ key: l.id, icon: 'gift', title: `${who(l)}: знакомство, ${fmtDay(l.start, me.tz)}`, text: `В ${fmtTime(l.start, me.tz)}, ${l.minutes} мин, бесплатно. Ответьте до ${fmtDayTime(l.confirmDeadline, me.tz)}.`, to: `/tutor/lessons/${l.id}`, deadline: l.confirmDeadline });
      else out.push({ key: l.id, tone: 'action', icon: 'clock', title: `${who(l)}: ${fmtDayTime(l.start, me.tz)}`, text: `Урок ${l.minutes} мин, ${fmtMoney(l.tutorPrice)}. Осталось ${fmtDuration(l.confirmDeadline - at)} на ответ.`, to: `/tutor/lessons/${l.id}`, deadline: l.confirmDeadline });
    }
    if (l.reschedule?.status === 'pending' && l.reschedule.by === 'student' && l.status === 'confirmed')
      out.push({ key: `${l.id}-r`, tone: 'action', icon: 'repeat', title: `${who(l)} просит перенести урок`, text: `С ${fmtDayTime(l.start, me.tz)} на ${fmtDayTime(l.reschedule.newStart, me.tz)}.`, to: `/tutor/lessons/${l.id}`, deadline: l.start });
  }
  return out;
}

function evKind(l: Lesson, at: number): [string, string] {
  const ph = rules.phase(l, at);
  if (ph === 'disputed') return ['bad', 'спор'];
  if (ph === 'no_show') return ['bad', 'неявка'];
  if (ph === 'completed') return ['done', l.kind === 'intro' ? 'знакомство' : l.subject.replace(/ язык$/, '').toLowerCase()];
  if (ph === 'awaiting') return ['done', 'ждёт ответа'];
  if (l.kind === 'intro') return ['intro', ph === 'pending' ? 'знакомство?' : 'знакомство'];
  if (ph === 'pending') return ['lesson', 'подтвердить?'];
  if (ph === 'unpaid') return ['bad', 'не оплачен'];
  if (!l.link) return ['lesson', 'нет ссылки'];
  return ['lesson', l.subject.replace(/ язык$/, '').toLowerCase()];
}

export default function TutorLessons() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const tz = me.tz;
  const today = dateKey(at, tz);
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState(today);
  const t = tutorById(d, me.id);
  const lessons = useMemo(() => d.lessons.filter(l => l.tutorId === me.id && SHOWN.includes(l.status)).sort((a, b) => a.start - b.start), [d, me.id]);
  const free = useMemo(() => freeRanges(d, me.id, tz, at), [d, me.id, tz, at]);
  const incoming = incomingFor(d, me, at);
  const fin = sel.tutorFinance(d, me.id, at, tz);

  const wdToday = weekdayOfKey(today);
  const monday = addDaysKey(today, -wdToday + week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
  const inWeek = (l: Lesson) => { const k = dateKey(l.start, tz); return k >= days[0] && k <= days[6]; };
  const weekLessons = lessons.filter(inWeek);
  const weekFree = days.reduce((s, k) => s + (free.get(k)?.length ?? 0), 0);
  const waiting = incoming.length;
  const a = parseDateKey(days[0]);
  const b = parseDateKey(days[6]);
  const range = a.month === b.month ? `${a.day}–${b.day} ${monthGen(a.month)}` : `${a.day} ${monthGen(a.month)} – ${b.day} ${monthGen(b.month)}`;
  const tzLabel = `Ваше время, ${zoneCity(tz)}${tz === 'Europe/Moscow' ? '' : `, ${mskDiffLabel(tz)}`}`;

  const alerts = incoming.map(x => (
    <Alert key={x.key} tone={x.tone} icon={x.icon} title={x.title} style={{ maxWidth: 'none' }} action={<Btn v={x.tone ? 'white' : 'gray'} size="s" to={x.to}>Ответить</Btn>}>{x.text}</Alert>
  ));
  const noProfile = !t?.published && (
    <Alert tone="action" icon="user" title="Анкета ещё не опубликована" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/profile/edit">Заполнить</Btn>}>Ученики увидят вас в каталоге после публикации.</Alert>
  );

  /* ---------- desktop: week grid ---------- */
  const hours = new Set<number>();
  for (const l of weekLessons) hours.add(zoned(l.start, tz).hour);
  for (const k of days) for (const [s, e] of free.get(k) ?? []) for (let x = s; x < e; x += 3600_000) hours.add(zoned(x, tz).hour);
  const hourList = [...hours].sort((x, y) => x - y);
  const grid: ReactNode[] = [<div key="corner" className="wh" />];
  days.forEach(k => grid.push(<div key={`h${k}`} className={cx('wh', k === today && 'today')}>{weekdayLower(weekdayOfKey(k))}<b>{parseDateKey(k).day}</b></div>));
  for (const h of hourList) {
    grid.push(<div key={`t${h}`} className="tm">{`${String(h).padStart(2, '0')}:00`}</div>);
    for (const k of days) {
      const ls = weekLessons.filter(l => dateKey(l.start, tz) === k && zoned(l.start, tz).hour === h);
      const fr = (free.get(k) ?? []).find(([s, e]) => zoned(s, tz).hour <= h && zoned(e - 1, tz).hour >= h && s >= at - 3600_000);
      grid.push(
        <div key={`${k}${h}`}>
          {ls.map(l => { const [kind, small] = evKind(l, at); return <Link key={l.id} to={`/tutor/lessons/${l.id}`} className={`ev ev--${kind}`}>{who(l)}<small>{small}</small></Link>; })}
          {!ls.length && fr && <Link to="/tutor/schedule/exceptions" className="ev ev--free">окно</Link>}
        </div>,
      );
    }
  }
  const legend = (
    <div className="legend">
      <span><i style={{ background: 'var(--accent-soft)' }} />урок</span>
      <span><i style={{ background: 'var(--fill)' }} />проведён</span>
      <span><i style={{ background: 'var(--green-soft)' }} />знакомство</span>
      <span><i style={{ background: 'var(--red-soft)' }} />спор</span>
      <span><i style={{ boxShadow: 'inset 0 0 0 1.5px #b9dcc8' }} />свободное окно</span>
    </div>
  );

  /* ---------- phone: day list ---------- */
  const card = (l: Lesson) => {
    const st = userById(d, l.studentId);
    const otherTz = st?.tz ?? tz;
    const ph = rules.phase(l, at);
    const subLine = otherTz === tz ? `до ${fmtTime(l.end, tz)}` : `до ${fmtTime(l.end, tz)} по вашему · у ${genitive(l.participant.name)} ${fmtTime(l.start, otherTz)} ${mskDiffLabel(otherTz)}`;
    const needLink = (ph === 'upcoming' || ph === 'live') && !l.link;
    return (
      <LessonCard
        key={l.id}
        to={`/tutor/lessons/${l.id}`}
        when={fmtDayTime(l.start, tz)}
        sub={subLine}
        status={lessonStatus(l, 'tutor', at)}
        person={<Person name={who(l)} sub={l.kind === 'intro' ? 'Знакомство' : l.subject} tone={st?.tone ?? 'teal'} src={st?.photo} />}
        facts={[['clock', `${l.minutes} мин`], ['video', l.link ? linkService(l.link) : 'Нет ссылки'], ['wallet', l.tutorPrice ? `Вы получите ${fmtMoney(l.tutorPrice)}` : 'бесплатно']]}
        note={needLink ? <Note tone="action" icon="video">{`Добавьте ссылку, ${l.participant.name} её ждёт.`}</Note> : undefined}
        actions={ph === 'pending' ? <Btn v="primary" size="m" to={`/tutor/lessons/${l.id}`}>Ответить</Btn> : needLink ? <Btn v="primary" size="m" to={`/tutor/lessons/${l.id}`}>Добавить ссылку</Btn> : <Btn v="tinted" size="m" to={`/tutor/lessons/${l.id}`}>Открыть урок</Btn>}
      />
    );
  };
  const dayLessons = lessons.filter(l => dateKey(l.start, tz) === day);
  const dayFree = (free.get(day) ?? []).filter(([, e]) => e > at);
  const later = lessons.filter(l => dateKey(l.start, tz) > day && rules.isUpcoming(l, at)).slice(0, 8);
  const pdays = Array.from({ length: 14 }, (_, i) => addDaysKey(today, i - wdToday));
  const has = new Set(pdays.filter(k => k >= today || lessons.some(l => dateKey(l.start, tz) === k)));

  if (phone)
    return (
      <Page title="Уроки" kind="cabinet" tab="Уроки">
        <div className="between"><h1 className="h1">Уроки</h1><Btn v="gray" size="m" circle icon="cal" to="/tutor/schedule/exceptions" aria-label="Расписание и окна" /></div>
        <DateStrip days={pdays} selected={day} onSelect={setDay} tz={tz} available={has} />
        <Tz>{tzLabel}</Tz>
        {noProfile}
        {alerts}
        <h2 className="r7-sec">{fmtDay(Date.parse(`${day}T12:00:00Z`), 'UTC')}</h2>
        {dayLessons.length ? dayLessons.map(card) : !dayFree.length && <p className="small">{day < today ? 'В этот день уроков не было.' : 'В этот день уроков нет и окна закрыты.'}</p>}
        {dayFree.map(([s, e]) => <Link key={s} to="/tutor/schedule/exceptions" className="r7-free" style={{ textDecoration: 'none' }}><span>{`${fmtTime(s, tz)}–${fmtTime(e, tz)}`}</span><span>свободное окно</span></Link>)}
        {later.length > 0 && (
          <>
            <h2 className="r7-sec">Дальше</h2>
            <div className="r7-list">{later.map(l => { const st = userById(d, l.studentId); return <LessonRow key={l.id} to={`/tutor/lessons/${l.id}`} tone={st?.tone ?? 'teal'} src={st?.photo} when={fmtDayTime(l.start, tz)} who={`${who(l)} · ${l.kind === 'intro' ? 'знакомство' : l.subject.replace(/ язык$/, '')}`} status={<span className="row-s">{l.seriesId && rules.phase(l, at) === 'upcoming' ? <St tone="neutral" icon="repeat">{seriesLabel(d, l)}</St> : lessonStatus(l, 'tutor', at)}</span>} />; })}</div>
          </>
        )}
        {!lessons.length && !incoming.length && <Empty icon="cal" title="Уроков пока нет" action={<Btn v="primary" to="/tutor/requests">Заявки учеников</Btn>}>Откликайтесь на заявки и держите окна открытыми, чтобы ученики записывались.</Empty>}
      </Page>
    );

  return (
    <Page title="Уроки" kind="cabinet" side="Уроки">
      <div className="between" style={{ alignItems: 'flex-end' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div className="row-s" style={{ gap: 10 }}><h1 className="h1">{nb(`Уроки, ${range}`)}</h1><IBtn icon="left" label="Прошлая неделя" onClick={() => setWeek(w => w - 1)} /><IBtn icon="right" label="Следующая неделя" onClick={() => setWeek(w => w + 1)} />{week !== 0 && <Btn size="s" onClick={() => setWeek(0)}>Сегодня</Btn>}</div>
          <Tz>{tzLabel}</Tz>
        </div>
        <div className="row-s" style={{ flexWrap: 'nowrap' }}><Btn size="m" to="/tutor/profile/edit?step=4">Регулярная неделя</Btn><Btn v="primary" size="m" icon="plus" to="/tutor/schedule/exceptions">Открыть окно</Btn></div>
      </div>
      {noProfile}
      {alerts.length > 0 && <div className="cols half">{alerts}</div>}
      <div className="kpis">
        <div className="kpi"><span>Уроков на неделе</span><b>{weekLessons.length}</b></div>
        <div className="kpi"><span>Окон свободно</span><b>{weekFree}</b></div>
        <div className="kpi"><span>Ждут ответа</span><b>{waiting}</b></div>
        <div className="kpi"><span>К выплате</span><b>{fmtMoney(fin.waiting)}</b></div>
      </div>
      {hourList.length ? <div className="week-wrap"><div className="week" aria-label="Неделя">{grid}</div></div> : <Empty icon="cal" title="На этой неделе ни уроков, ни окон" style={{ maxWidth: 'none' }} action={<Btn v="primary" to="/tutor/schedule/exceptions">Открыть окно</Btn>}>Откройте время в расписании, чтобы ученики могли записаться.</Empty>}
      {legend}
    </Page>
  );
}

export function seriesLabel(d: Db, l: Lesson) {
  const s = d.series.find(x => x.id === l.seriesId);
  if (!s) return 'Серия';
  return `Серия ${s.lessonIds.indexOf(l.id) + 1} из ${s.count}`;
}
