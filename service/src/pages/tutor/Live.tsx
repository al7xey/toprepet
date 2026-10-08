import { Link, Navigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Btn, IBtn, St, Switch, Tz, cx } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, schedule, tutors as tApi, tutorById } from '../../api';
import type { Lesson, TutorProfile } from '../../api/types';
import { nb } from '../../lib/text';
import { addDaysKey, dateKey, monthGen, monthShort, parseDateKey, utcLabel, weekdayLower, weekdayOfKey, zoneCity, zoned } from '../../lib/time';
import { Chance, ReqList, WeekGrid } from './shared';

export default function Live() {
  const d = useDb();
  const me = useSession()!;
  const t = tutorById(d, me.id);
  if (!t) return <Navigate to="/tutor/lessons" replace />;
  return <Inner t={t} />;
}

function Inner({ t }: { t: TutorProfile }) {
  const d = useDb();
  const at = useNow();
  const phone = usePhone();
  const { run, toast } = useApp();
  const tz = t.tz;
  const today = dateKey(at, tz);
  const monday = addDaysKey(today, -weekdayOfKey(today));
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
  const lessons = d.lessons.filter(l => l.tutorId === t.userId && ['pending', 'confirmed', 'unpaid', 'completed', 'no_show', 'disputed'].includes(l.status) && days.includes(dateKey(l.start, tz)));
  const lessonAt = (k: string, h: number) => lessons.find(l => dateKey(l.start, tz) === k && zoned(l.start, tz).hour === h);
  const hoursSet = new Set<number>();
  days.forEach(k => schedule.openHours(t, k).forEach(h => hoursSet.add(h)));
  lessons.forEach(l => hoursSet.add(zoned(l.start, tz).hour));
  const hours = hoursSet.size ? Array.from({ length: Math.max(...hoursSet) - Math.min(...hoursSet) + 1 }, (_, i) => Math.min(...hoursSet) + i) : [];
  const kind = (l: Lesson) => (l.status === 'pending' ? 'rq' : l.status === 'completed' || l.end < at ? 'done' : 'bk');
  const cell = (dd: number, h: number) => {
    const k = days[dd];
    const l = lessonAt(k, h);
    if (l) return kind(l);
    if (k < today) return 'past';
    return schedule.openHours(t, k).has(h) ? 'free' : '';
  };
  const url = `toprepet.ru/teachers/${t.slug}`;
  const copy = () => { void navigator.clipboard?.writeText(`https://${url}`); toast('Ссылка скопирована', { tone: 'ok' }); };
  const a = parseDateKey(days[0]);
  const b = parseDateKey(days[6]);
  const range = a.month === b.month ? `${a.day}–${b.day} ${monthGen(a.month)}` : `${a.day} ${monthGen(a.month)} – ${b.day} ${monthGen(b.month)}`;
  const docsBad = t.docs.filter(x => x.status === 'rejected');
  const docsReview = t.docs.filter(x => x.status === 'review');
  const docsOk = t.docs.filter(x => x.status === 'ok');
  const listed = tApi.isListed(t);

  const addr = (
    <div className="card">
      <div className="between" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 2, minWidth: 0 }}><span className="small">Адрес анкеты</span><b style={{ fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</b></div>
        <Btn size="s" icon="share" onClick={copy}>Копировать ссылку</Btn>
      </div>
    </div>
  );
  const vis = (
    <div className="card">
      <label className="between" style={{ cursor: 'pointer' }}><b className="h3">Анкета видна в каталоге</b><Switch checked={t.visible} onChange={v => run(() => tApi.setVisible(v), v ? 'Анкета снова в каталоге' : 'Анкета на паузе. Ученики и уроки сохранятся')} label="Анкета видна в каталоге" /></label>
      <p className="small" style={{ fontSize: 15 }}>{t.visible ? 'Выключите, чтобы взять паузу. Ученики и уроки сохранятся.' : 'Пауза: анкеты нет в каталоге и в подборе заявок. Запланированные уроки остаются в силе.'}</p>
    </div>
  );
  const docs = (
    <div className="card">
      <div className="between"><b className="h3">Документы</b>{docsBad.length ? <St tone="bad" icon="warn">Нужно действие</St> : docsReview.length ? <St icon="clock">На проверке</St> : docsOk.length ? <St tone="ok" icon="shield">Проверены</St> : <St>Не добавлены</St>}</div>
      <p className="small" style={{ fontSize: 15 }}>{nb(docsBad.length ? `${docsBad.map(x => x.name).join(', ')} отклонён: ${docsBad[0].reason?.toLowerCase() ?? 'загрузите заново'}${docsOk.length ? ` ${docsOk[0].name} проверен.` : ''}` : docsReview.length ? `${docsReview.map(x => x.name).join(', ')} проверяем, обычно за 1–2 рабочих дня.` : docsOk.length ? 'В анкете есть значок «Документы проверены».' : 'Анкеты со значком «Документы проверены» выбирают в 2 раза чаще.')}</p>
      <div><Btn v={docsBad.length || !t.docs.length ? 'tinted' : 'gray'} size="s" to="/tutor/profile/documents">{docsBad.length ? 'Загрузить заново' : t.docs.length ? 'Открыть' : 'Добавить'}</Btn></div>
    </div>
  );
  const notPublished = !t.published && (
    <Alert tone="action" icon="user" title="Анкета ещё не опубликована" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to={tApi.isReady(t) ? '/tutor/profile/publish' : '/tutor/profile/edit'}>{tApi.isReady(t) ? 'Опубликовать' : 'Продолжить'}</Btn>}>Ученики увидят вас в каталоге сразу после публикации, без модерации.</Alert>
  );
  const notListed = t.published && t.visible && !listed && (
    <Alert tone="bad" icon="warn" title="Анкета скрыта из каталога" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/profile/publish">Что исправить</Btn>}>Не хватает обязательного: фото, цены или свободного окна.</Alert>
  );
  const legend = <div className="legend"><span><i className="r2-free" />Свободно</span><span><i className="r2-rq" />Ждёт подтверждения</span><span><i className="r2-bk" />Урок</span><span><i className="r2-done" />Прошёл</span></div>;
  const head = days.map(k => ({ label: weekdayLower(weekdayOfKey(k)), day: parseDateKey(k).day, today: k === today }));
  const links = (
    <div className="r2-files">
      {([['user', 'Редактировать анкету', '/tutor/profile/edit'], ['cal', 'Расписание', '/tutor/profile/edit?step=4'], ['plus', 'Отпуск и разовые окна', '/tutor/schedule/exceptions'], ['clock', 'Мои уроки', '/tutor/lessons'], ['eye', 'Как видят ученики', '/tutor/profile/preview'], ['star', 'Отзывы', '/tutor/reviews']] as const).map(([i, l, to]) => (
        <Link key={to} className="r2-li" to={to}><Icon name={i} /><span>{l}</span><Icon name="right" /></Link>
      ))}
    </div>
  );
  const evCell = (k: string, h: number) => {
    const l = lessonAt(k, h);
    if (l) return <Link className={`ev ev--${kind(l)}`} to={`/tutor/lessons/${l.id}`}>{l.participant.name}<small>{l.status === 'completed' || l.end < at ? 'проведён' : l.status === 'pending' ? 'ждёт ответа' : l.subject.replace(/ язык$/, '')}</small></Link>;
    if (k >= today && schedule.openHours(t, k).has(h)) return <div className="ev ev--free">Свободно</div>;
    return null;
  };
  const weekD = hours.length ? (
    <div className="week-wrap"><div className="week r2-week" style={{ minWidth: 0, gridTemplateColumns: '56px repeat(7,minmax(0,1fr))' }}>
      <div className="wh" />
      {days.map(k => <div key={k} className={cx('wh', k === today && 'today')}>{weekdayLower(weekdayOfKey(k))}<b>{parseDateKey(k).day}</b></div>)}
      {hours.map(h => [<div key={`t${h}`} className="tm">{`${h}:00`}</div>, ...days.map(k => <div key={`${k}${h}`}>{evCell(k, h)}</div>)])}
    </div></div>
  ) : <p className="small">На этой неделе окна закрыты. Откройте время в расписании.</p>;
  const checklist = !t.published && <div className="card"><b className="h3">Для публикации нужно</b><ReqList t={t} /></div>;
  const chancesCard = t.published && tApi.chances(t).some(c => !c.done) && (
    <div className="card r2-chance"><b className="h3">Повысит шансы</b>{tApi.chances(t).map(c => <Chance key={c.id} label={c.label} done={c.done} action={<Btn size="s" to={c.to}>Добавить</Btn>} />)}</div>
  );
  if (phone)
    return (
      <Page title="Анкета" kind="cabinet" tab="Анкета">
        <div className="between"><h1 className="h1">Анкета</h1><IBtn icon="eye" label="Как видят ученики" to="/tutor/profile/preview" /></div>
        {notPublished}{notListed}{checklist}
        {addr}{t.published && vis}{docs}
        <div className="card" style={{ padding: '16px 12px' }}>
          <div className="between" style={{ padding: '0 4px' }}><b className="h3">Эта неделя</b><span className="small">{nb(`${a.month === b.month ? `${a.day}–${b.day} ${monthShort(a.month)}` : `${a.day} ${monthShort(a.month)} – ${b.day} ${monthShort(b.month)}`} · ${utcLabel(tz)}`)}</span></div>
          {hours.length ? <WeekGrid hours={hours} head={head} cell={cell} /> : <p className="small">Окна на этой неделе закрыты.</p>}
          <div style={{ padding: '4px 4px 0' }}>{legend}</div>
        </div>
        {chancesCard}
        {links}
      </Page>
    );
  return (
    <Page title="Анкета" kind="cabinet" side="Анкета">
      <div className="between">
        <h1 className="h1">Анкета</h1>
        <div className="row-s"><Btn size="s" icon="user" to="/tutor/profile/edit">Редактировать</Btn><Btn size="s" icon="cal" to="/tutor/profile/edit?step=4">Расписание</Btn><Btn size="s" icon="clock" to="/tutor/lessons">Мои уроки</Btn><Btn size="s" icon="eye" to="/tutor/profile/preview">Как видят ученики</Btn></div>
      </div>
      {notPublished}{notListed}
      {addr}
      <div className="cols half">{t.published ? vis : checklist}{docs}</div>
      {chancesCard}
      <div className="card" style={{ gap: 14 }}>
        <div className="between"><b className="h3">{`Эта неделя · ${range}`}</b>{legend}</div>
        <Tz>{`Время ваше, ${zoneCity(tz)}, ${utcLabel(tz)}`}</Tz>
        {weekD}
      </div>
    </Page>
  );
}
