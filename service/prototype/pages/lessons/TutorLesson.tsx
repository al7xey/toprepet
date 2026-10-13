import { useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Btn, Chip, Empty, IBtn, Input, Kv, Note, Options, Sheet, St, TextField, Tz } from '../../ui/kit';
import { LessonCard, Person, TzLine, lessonStatus } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, rules, schedule, findPairChat, lessonById, tutorById, userById } from '../../api';
import type { Lesson } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { dative, genitive, instrumental } from '../../lib/names';
import { dateKey, fmtDay, fmtDayTime, fmtDuration, fmtTime, mskDiffLabel, utcLabel, weekdayOfKey, zoneCity } from '../../lib/time';
import { BackBtn, Rules, WasNew, linkService, slotLabel } from './shared';
import { who } from './TutorLessons';

const DECLINE_REASONS = ['Не могу в это время', 'Не мой уровень или предмет', 'Другое'];
const CANCEL_REASONS = ['Болезнь', 'Форс-мажор', 'Другое'];
const DAY_TITLE = ['Ваш понедельник', 'Ваш вторник', 'Ваша среда', 'Ваш четверг', 'Ваша пятница', 'Ваша суббота', 'Ваше воскресенье'];

export default function TutorLesson() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const [decline, setDecline] = useState(false);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [message, setMessage] = useState('');
  const [proposals, setProposals] = useState<number[]>([]);
  const [cancel, setCancel] = useState(false);
  const [cancelWhy, setCancelWhy] = useState('');
  const [noShow, setNoShow] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState('');
  const l = lessonById(d, id);
  const t = tutorById(d, me.id);
  const options = useMemo(() => (l && t ? schedule.freeSlots(d, t, { minutes: l.minutes, excludeLessonId: l.id, ignoreHorizon: true, untilDays: 14 }).filter(s => s !== l.start).slice(0, 9) : []), [d, l, t]);
  if (!l || !t || l.tutorId !== me.id) return <Page title="Урок" back="/tutor/lessons" kind="cabinet" side="Уроки"><Empty icon="cal" title="Урок не найден" action={<Btn to="/tutor/lessons">Уроки</Btn>} /></Page>;
  if (l.seriesId && l.status === 'pending' && d.series.find(s => s.id === l.seriesId)?.status === 'pending') return <Navigate to={`/tutor/series/${l.seriesId}`} replace />;

  const tz = me.tz;
  const st = userById(d, l.studentId);
  const otherTz = st?.tz ?? tz;
  const name = l.participant.name;
  const ph = rules.phase(l, at);
  const intro = l.kind === 'intro';
  const money = fmtMoney(l.tutorPrice);
  const studentMoney = fmtMoney(l.studentPrice - l.discount);
  const r = l.reschedule?.status === 'pending' ? l.reschedule : null;
  const chatId = findPairChat(d, l.studentId, l.tutorId)?.id;
  const openChat = () => navigate(chatId ? `/messages/${chatId}` : '/messages');
  const writeBtn = <Btn size="m" onClick={openChat}>{`Написать ${dative(name)}`}</Btn>;
  const prev = d.lessons.filter(x => x.tutorId === me.id && x.studentId === l.studentId && x.id !== l.id && ['confirmed', 'completed', 'no_show', 'disputed'].includes(x.status) && x.start < l.start).length;
  const subLine = otherTz === tz ? `до ${fmtTime(l.end, tz)}` : `до ${fmtTime(l.end, tz)} по вашему · у ${genitive(name)} ${fmtTime(l.start, otherTz)} ${mskDiffLabel(otherTz)}`;
  const card = (note?: ReactNode, actions?: ReactNode) => (
    <LessonCard
      when={fmtDayTime(l.start, tz)}
      sub={subLine}
      status={lessonStatus(l, 'tutor', at)}
      person={<Person name={who(l)} sub={intro ? `Знакомство · ${l.minutes} мин` : l.subject} tone={st?.tone ?? 'teal'} src={st?.photo} />}
      facts={[['clock', `${l.minutes} мин`], ['video', l.link ? linkService(l.link) : 'Нет ссылки'], ['wallet', intro ? 'бесплатно' : `Вы получите ${money}`]]}
      note={note}
      actions={actions}
    />
  );
  const saveLink = () => {
    const ok = run(() => { booking.setLink(l.id, link ?? ''); return true; });
    if (ok) { setLink(null); setLinkErr(''); toast(`${name} получил(а) ссылку и уведомление`, { tone: 'ok' }); }
  };
  const linkField = (
    <div className="field r7-field">
      <label htmlFor="lesson-link">Ссылка на урок</label>
      <div className="r7-linkrow">
        <Input id="lesson-link" inputMode="url" placeholder="https://telemost.yandex.ru/j/…" value={link ?? l.link ?? ''} invalid={!!linkErr} onChange={e => setLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveLink()} />
        <Btn v="primary" size="m" onClick={() => { if (!(link ?? '').trim()) return setLinkErr('Вставьте ссылку'); saveLink(); }}>Сохранить</Btn>
      </div>
      {linkErr ? <span className="err" role="alert">{linkErr}</span> : <span className="small" style={{ paddingLeft: 18 }}>{nb(`${name} сразу увидит кнопку «Подключиться»`)}</span>}
    </div>
  );
  const linkNote = l.link && link === null
    ? <Note icon="check"><span>{`Ссылка добавлена${l.linkAt ? ` в ${fmtTime(l.linkAt, tz)}` : ''}. `}<button type="button" className="btn-link" onClick={() => setLink(l.link ?? '')}>Изменить</button></span></Note>
    : linkField;

  /* ---------- sheets ---------- */
  const toggleProposal = (s: number) => setProposals(p => (p.includes(s) ? p.filter(x => x !== s) : p.length >= 3 ? p : [...p, s]));
  const declineSheet = (
    <Sheet open={decline} onClose={() => setDecline(false)} title={intro ? 'Отклонить знакомство' : 'Отклонить запись'} wide className="r4">
      <Options legend="Причина" legendClass="r4-lbl" options={DECLINE_REASONS} value={reason} onChange={setReason} />
      {options.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          <span className="r4-lbl">Предложить другое время <span className="muted" style={{ fontWeight: 500 }}>до 3 окон</span></span>
          <div className={`slots ${phone ? 'r4-sl2' : 'r4-sl3'}`} role="group" aria-label="Другое время">
            {options.map(s => <button key={s} type="button" className="slot" aria-pressed={proposals.includes(s)} onClick={() => toggleProposal(s)}>{slotLabel(s, tz)}</button>)}
          </div>
          <Tz>{`Ваше время, ${zoneCity(tz)}`}</Tz>
        </div>
      )}
      <TextField label={`Сообщение ${dative(name)}`} optional="необязательно" multiline rows={3} value={message} onChange={setMessage} placeholder="Например: в среду не успеваю, могу в четверг" maxLength={500} style={{ maxWidth: 'none' }} />
      <Btn v="primary" block onClick={() => {
        const ok = run(() => { booking.declineLesson(l.id, reason, message, proposals); return true; });
        if (ok) { setDecline(false); toast(`${name} получил(а) ответ${proposals.length ? ' и ваше время' : ''}`, { tone: 'ok' }); navigate('/tutor/lessons'); }
      }}>{proposals.length ? 'Отклонить и предложить' : 'Отклонить'}</Btn>
      {!intro && <span className="small" style={{ textAlign: 'center' }}>{nb(`Заморозка у ${genitive(name)} снимется сразу`)}</span>}
    </Sheet>
  );
  const cancelSheet = (
    <Sheet open={cancel} onClose={() => setCancel(false)} title="Отменить урок?">
      <span className="sub" style={{ marginTop: -6 }}>{nb(`${name} · ${fmtDayTime(l.start, tz)} по вашему`)}</span>
      <div className="field r7-field"><span className="label">Причина</span><div className="row-s">{CANCEL_REASONS.map(x => <Chip key={x} pressed={cancelWhy === x} onClick={() => setCancelWhy(x)}>{x}</Chip>)}</div></div>
      {!intro && l.paymentId && <Note icon="card">{`${dative(name)} вернём ${studentMoney} и предложим выбрать другое время.`}</Note>}
      <Note icon="eye">В анкете и каталоге отмена не видна.</Note>
      <div className="r7-col">
        <Btn v="danger" onClick={() => {
          if (!cancelWhy) return toast('Выберите причину', { tone: 'bad' });
          const ok = run(() => { booking.cancelByTutor(l.id, cancelWhy); return true; });
          if (ok) { setCancel(false); toast(`${name} получил(а) уведомление`, { tone: 'ok' }); navigate('/tutor/lessons'); }
        }}>Отменить урок</Btn>
        <Btn onClick={() => setCancel(false)}>Оставить урок</Btn>
      </div>
    </Sheet>
  );
  const noShowSheet = (
    <Sheet open={noShow} onClose={() => setNoShow(false)} title={`${name} не пришёл(а)?`}>
      <span className="sub" style={{ marginTop: -6 }}>{nb(intro ? `Мы сообщим ${dative(name)}.` : `Мы сообщим ${dative(name)}. ${money} придут вам как за проведённый урок, если ${name} не оспорит за 24 ч.`)}</span>
      <div className="r7-col">
        <Btn v="primary" onClick={() => { const ok = run(() => { booking.markNoShow(l.id); return true; }); if (ok) { setNoShow(false); toast('Неявка отмечена', { tone: 'ok' }); navigate('/tutor/lessons'); } }}>Да, отметить неявку</Btn>
        <Btn onClick={() => setNoShow(false)}>{`${name} пришёл(а)`}</Btn>
      </div>
    </Sheet>
  );

  /* ---------- states ---------- */
  let title = `Урок с ${instrumental(name)}`;
  let mTitle = intro ? 'Знакомство' : 'Урок';
  let subTitle = '';
  let top: ReactNode = null;
  let main: ReactNode = null;
  let side: ReactNode = null;
  const k = dateKey(l.start, tz);
  const dayList = () => {
    const ls = d.lessons.filter(x => x.tutorId === me.id && dateKey(x.start, tz) === k && ['pending', 'confirmed', 'unpaid'].includes(x.status)).sort((a, b) => a.start - b.start);
    const fr = schedule.freeSlots(d, t, { minutes: 60, ignoreHorizon: true, ignoreNotice: true, untilDays: 30 }).filter(s => dateKey(s, tz) === k);
    const rows = [...ls.map(x => ({ at: x.start, x })), ...fr.map(s => ({ at: s, x: null as Lesson | null }))].sort((a, b) => a.at - b.at);
    return (
      <section className="card"><h3 className="h3">{nb(`${DAY_TITLE[weekdayOfKey(k)]}, ${fmtDay(l.start, tz).split(/\s/).slice(1).join(' ')}`)}</h3>
        <div>{rows.map(row => (
          <div className="r4-row" key={row.at + (row.x?.id ?? '')}>
            <b>{fmtTime(row.at, tz)}</b>
            {row.x ? <><span className="small">{who(row.x)}</span>{row.x.id === l.id ? <St tone="action" icon="clock">Ждёт вас</St> : row.x.status === 'pending' ? <St tone="action" icon="clock">Ждёт ответа</St> : <St tone="ok" icon="check">Урок</St>}</> : <><span className="small">Свободно</span><St>Окно</St></>}
          </div>
        ))}</div>
      </section>
    );
  };

  if (ph === 'pending') {
    mTitle = intro ? 'Знакомство' : 'Новая запись';
    title = intro ? 'Новая запись на знакомство' : 'Новая запись';
    subTitle = 'Подтвердите или отклоните одним нажатием.';
    const left = l.confirmDeadline - at;
    const confirm = () => { const ok = run(() => { booking.confirmLesson(l.id); return true; }); if (ok) { toast(`${name} получил(а) подтверждение`, { tone: 'ok' }); navigate('/tutor/lessons'); } };
    main = (
      <>
        <section className="card">
          {intro && <div className="row-s" style={{ gap: 6 }}><St tone="ok" icon="gift">Бесплатно</St><St icon="user">Одно на ученика</St></div>}
          <Person name={who(l)} sub={intro ? 'Хочет познакомиться' : prev ? `${prev + 1}-й урок с вами` : 'Первый урок с вами'} tone={st?.tone ?? 'teal'} src={st?.photo} />
          <Kv rows={intro
            ? [['Когда', `${fmtDayTime(l.start, tz)}–${fmtTime(l.end, tz)}`], ['Длительность', `${l.minutes} мин`], ...(l.comment ? [['Цель', l.comment] as [string, string]] : [])]
            : [['Когда', fmtDayTime(l.start, tz)], ['Предмет', `${l.subject}, ${l.minutes} мин`], ['Вы получите', money]]} />
          {!intro && l.comment && <div className="r4-quote">{nb(`«${l.comment}»`)}</div>}
          <div className="r4-timer"><St tone="action" icon="clock">{`Осталось ${fmtDuration(left)}`}</St><span className="small">{nb(`До ${fmtDayTime(l.confirmDeadline, tz)}, потом отменится сама`)}</span></div>
          <div className="cols half" style={{ gap: 8 }}><Btn v="primary" block onClick={confirm}>Подтвердить</Btn><Btn block onClick={() => setDecline(true)}>Отклонить</Btn></div>
        </section>
        <Tz>{`Время ваше, ${zoneCity(tz)} (${utcLabel(tz)})${otherTz !== tz ? `. У ${genitive(name)} ${fmtTime(l.start, otherTz)}` : ''}`}</Tz>
        <Note>{intro ? 'Знакомство бесплатное и одно на ученика. Оплаты нет, поэтому оно не защищено от неявки.' : `Окно ${fmtDayTime(l.start, tz)} уже занято, другие ученики его не видят. ${name} заморозил(а) ${studentMoney}, спишем при подтверждении.`}</Note>
      </>
    );
    side = dayList();
  } else if (ph === 'upcoming' || ph === 'unpaid') {
    const soon = !l.link && l.start - at <= 15 * 60_000;
    top = soon && <Alert tone="action" icon="clock" title={`Урок с ${instrumental(name)} через ${Math.max(1, Math.round((l.start - at) / 60000))} мин`} style={{ maxWidth: 'none' }}>{`А ссылки ещё нет. Вставьте её ниже, ${name} получит уведомление.`}</Alert>;
    const free = rules.canCancelFree(l, at);
    const acts = <>{writeBtn}{free && !r && l.status === 'confirmed' && <Btn size="m" to={`/tutor/lessons/${l.id}/move`}>Перенести</Btn>}<Btn size="m" onClick={() => setCancel(true)}>Отменить урок</Btn></>;
    const moveIn = r && r.by === 'student' && (
      <div className="card">
        <Person name={who(l)} sub="Просит перенести урок" tone={st?.tone ?? 'teal'} src={st?.photo} />
        <WasNew was={fmtDayTime(l.start, tz)} now={fmtDayTime(r.newStart, tz)} wasLabel="Было" newLabel="По вашему" />
        <span className="small">{nb(`${otherTz !== tz ? `У ${genitive(name)} это ${fmtTime(r.newStart, otherTz)} ${mskDiffLabel(otherTz)}. ` : ''}${intro ? '' : `Оплата ${money} переходит на новое время. `}Если откажетесь, урок останется в старое время.`)}</span>
        <div className="r7-btns">
          <Btn v="primary" size="m" onClick={() => { const ok = run(() => { booking.answerReschedule(l.id, true); return true; }); if (ok) toast(`Перенос принят, ${name} получил(а) уведомление`, { tone: 'ok' }); }}>Принять</Btn>
          <Btn size="m" onClick={() => run(() => booking.answerReschedule(l.id, false), 'Урок остаётся в старое время')}>Оставить старое время</Btn>
        </div>
      </div>
    );
    const myMove = r && r.by === 'tutor' && <Note tone="action" icon="repeat">{`Вы предложили перенос на ${fmtDayTime(r.newStart, tz)}. Ждём ответа ${genitive(name)}.`}</Note>;
    const noShowHint = <Note>{`«Ученик не пришёл» появится в ${fmtTime(rules.noShowFrom(l), tz)}, через 15 минут после начала.`}</Note>;
    if (r?.by === 'student') { title = 'Перенос урока'; mTitle = 'Перенос урока'; }
    if (phone) main = <>{top}{moveIn}{card(<>{linkNote}{myMove}</>)}<div className="r7-btns">{acts}</div>{noShowHint}</>;
    else main = <>{moveIn}{card(<>{linkNote}{myMove}</>, acts)}</>;
    side = (
      <>
        {!intro && <div className="card"><b className="h3">Деньги за урок</b><Kv rows={[['Цена урока', money], ['Статус', l.status === 'unpaid' ? 'Ждёт оплаты' : l.paymentId ? 'Оплачено' : 'Спишем за 24 ч'], ['Придут на карту', t.payout?.card ? `•• ${t.payout.card.slice(-4)}` : 'Не настроена']]} /><span className="small">После урока или не позже 24 ч после его конца.</span>{!t.payout?.card && <div><Btn size="s" to="/tutor/payouts/setup">Настроить выплаты</Btn></div>}</div>}
        <div className="card"><Rules items={[{ icon: 'video', on: true, text: 'Ссылку можно вставить в любой момент до начала, хоть за 5 минут.' }, { icon: 'info', text: `«Ученик не пришёл» появится в ${fmtTime(rules.noShowFrom(l), tz)}.` }]} /></div>
      </>
    );
  } else if (ph === 'live' || ph === 'awaiting') {
    if (ph === 'live') mTitle = 'Урок идёт';
    const can = at >= rules.noShowFrom(l) && at <= rules.answerUntil(l);
    const note = ph === 'awaiting'
      ? <Note icon="clock">{intro ? 'Знакомство закончилось.' : `Ждём, когда ${name} подтвердит урок. Оплата придёт не позже ${fmtDayTime(rules.answerUntil(l), tz)}.`}</Note>
      : can ? <Note tone="action" icon="clock">{`Прошло 15 минут. Если ${name} так и не подключился(ась), отметьте неявку.`}</Note> : l.link ? <Note icon="check">{`Ссылка добавлена${l.linkAt ? ` в ${fmtTime(l.linkAt, tz)}` : ''}.`}</Note> : linkField;
    const open = l.link && ph === 'live' ? <a className={`btn btn--primary btn--m${phone ? ' btn--block' : ''}`} href={l.link} target="_blank" rel="noreferrer">{`Открыть ${linkService(l.link)}`}</a> : null;
    main = <>{card(note, phone ? open : <>{open}{writeBtn}</>)}</>;
    const absent = (
      <div className="card"><b className="h3">{`${name} не пришёл(а)?`}</b>
        <span className="small">{nb(can ? (intro ? 'Отметьте неявку, мы сообщим ученику.' : `Отметьте неявку, и ${money} придут вам как за проведённый урок, если ${name} не оспорит за 24 ч.`) : `Кнопка появится в ${fmtTime(rules.noShowFrom(l), tz)}, через 15 минут после начала.`)}</span>
        <div className="r7-btns"><Btn size="m" disabled={!can} onClick={() => setNoShow(true)}>Ученик не пришёл</Btn></div>
      </div>
    );
    if (phone) main = <>{main}{absent}</>;
    else side = absent;
  } else {
    const tr = d.transfers.find(x => x.lessonId === l.id);
    const dp = d.disputes.find(x => x.id === l.disputeId);
    let note: ReactNode = null;
    let acts: ReactNode = null;
    if (ph === 'completed') note = <Note icon="check">{intro ? 'Знакомство прошло. Предложите ученику первый урок в чате.' : tr?.status === 'sent' ? `${money} перевели вам ${fmtDayTime(tr.sentAt!, tz)}.` : tr?.status === 'failed' ? 'Перевод не прошёл. Проверьте карту в настройках выплат.' : `${money} переводим вам. Обычно в течение дня.`}</Note>;
    else if (ph === 'no_show') note = <Note tone="action" icon="warn">{`Вы отметили неявку. ${intro ? '' : `${money} придут, если ${name} не оспорит до ${fmtDayTime((l.noShowAt ?? at) + 24 * 3600_000, tz)}.`}`}</Note>;
    else if (ph === 'disputed') { note = <Note tone="action" icon="help">{`${name} сообщил(а) о проблеме. ${money} в споре до решения поддержки.`}</Note>; acts = dp && <Btn v="primary" size="m" to={`/tutor/disputes/${dp.id}`}>Открыть спор</Btn>; }
    else if (ph === 'cancelled') note = <Note icon="x">{l.cancel?.by === 'tutor' ? `Вы отменили урок: ${l.cancel.reason.toLowerCase()}.` : l.cancel?.by === 'student' ? `${name} отменил(а) урок${l.cancel.refund ? '.' : `, поздно: ${money} придут вам.`}` : 'Урок отменился сам.'}</Note>;
    else if (ph === 'declined') note = <Note icon="x">{`Вы отклонили запись: ${l.decline?.reason.toLowerCase()}.`}</Note>;
    else if (ph === 'expired') note = <Note icon="clock">Запись не подтвердили вовремя, она отменилась сама.</Note>;
    main = card(note, <>{acts}{writeBtn}</>);
  }

  const head = <div className="title-block"><h1 className="h1">{nb(title)}</h1>{subTitle && <p className="sub">{subTitle}</p>}</div>;
  const sheets = <>{declineSheet}{cancelSheet}{noShowSheet}</>;
  if (phone)
    return (
      <Page title={title} back="/tutor/lessons" mTitle={mTitle} right={chatId ? <IBtn icon="chat" label={`Чат с ${instrumental(name)}`} onClick={openChat} /> : undefined} className="r4">
        {ph === 'pending' && intro && <h1 className="h2">Новая запись на знакомство</h1>}
        {main}
        {ph === 'pending' ? null : side && ph !== 'upcoming' && ph !== 'unpaid' ? side : null}
        {sheets}
      </Page>
    );
  return (
    <Page title={title} kind="cabinet" side="Уроки" className="r4">
      <BackBtn to="/tutor/lessons" label="Уроки" />
      {head}
      {top}
      <div className="cols c2">
        <div className="r7-col" style={{ gap: 16 }}>{main}</div>
        <div className="r7-col" style={{ gap: 16 }}>{side}{otherTz !== tz && ph !== 'pending' && <TzLine viewerTz={tz} otherTz={otherTz} otherName={genitive(name)} sample={l.start} />}</div>
      </div>
      {sheets}
    </Page>
  );
}
