import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Btn, Empty, IBtn, Note, Sheet, St, TextField, Timeline, type TimelineItem } from '../../ui/kit';
import { LessonCard, Person, TeacherGrid, TzLine, catalogItem, lessonStatus } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, chat, rules, schedule, sel, tutors as tApi, lessonById, tutorById } from '../../api';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { dative, genitive, instrumental } from '../../lib/names';
import { fmtDay, fmtDayTime, fmtTime, mskDiffLabel } from '../../lib/time';
import { checkoutUrl } from '../booking/Pick';
import { BackBtn, ConnectBtn, MoneyTimeline, PaymentCard, Rules, WasNew, linkService, paidOf, paymentOf, slotLabel } from './shared';

export default function StudentLesson() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const [cancel, setCancel] = useState(false);
  const [why, setWhy] = useState('');
  const [absent, setAbsent] = useState(false);
  const [proposal, setProposal] = useState<number | null>(null);
  const l = lessonById(d, id);
  const t = l && tutorById(d, l.tutorId);
  if (!l || !t || l.studentId !== me.id) return <Page title="Урок" back="/my/lessons" kind="cabinet" side="Мои уроки"><Empty icon="cal" title="Урок не найден" action={<Btn to="/my/lessons">Мои уроки</Btn>}>Возможно, ссылка устарела.</Empty></Page>;

  const tz = me.tz;
  const first = t.name.split(' ')[0];
  const ph = rules.phase(l, at);
  const intro = l.kind === 'intro';
  const paid = paidOf(l);
  const money = fmtMoney(paid);
  const pay = paymentOf(d, l);
  const cardLabel = pay?.method.kind === 'card' ? `карту •• ${pay.method.last4}` : 'счёт, с которого платили';
  const freeUntil = rules.freeCancelUntil(l);
  const free = rules.canCancelFree(l, at);
  const openChat = () => {
    const chatId = run(() => chat.openChatWithTutor(t.userId));
    if (chatId) navigate(`/messages/${chatId}`);
  };
  const writeBtn = (label = `Написать ${dative(first)}`) => <Btn size="m" onClick={openChat}>{label}</Btn>;
  const sub = `до ${fmtTime(l.end, tz)} ${mskDiffLabel(tz)}${l.participant.kind === 'child' ? ` · занимается ${l.participant.name}` : ''}`;
  const where = l.link ? linkService(l.link) : intro ? 'Онлайн' : 'Ссылка перед уроком';
  const priceFact = intro ? 'бесплатно' : ph === 'pending' && pay ? `${money} заморожены` : money;
  const card = (note?: ReactNode, actions?: ReactNode) => (
    <LessonCard
      when={fmtDayTime(l.start, tz)}
      sub={sub}
      status={lessonStatus(l, 'student', at)}
      person={<Person name={t.name} sub={intro ? `Знакомство · ${l.minutes} мин` : l.subject} tone={t.tone} src={t.photo} />}
      facts={[['clock', `${l.minutes} мин`], ['video', where], ['card', priceFact]]}
      note={note}
      actions={actions}
    />
  );
  const lessonTitle = intro ? `Знакомство с ${instrumental(first)}` : `Урок с ${instrumental(first)}`;
  const book = `/teachers/${t.slug}/book`;

  /* ---------- the cancel sheet ---------- */
  const cancelSheet = (
    <Sheet open={cancel} onClose={() => setCancel(false)} title="Отменить урок?">
      <span className="sub" style={{ marginTop: -6 }}>{nb(`${fmtDayTime(l.start, tz)} · ${t.name}`)}</span>
      {!intro && pay && l.status === 'confirmed' && !free && <Alert tone="bad" icon="warn" title="До начала меньше 4 часов" style={{ maxWidth: 'none' }}>{`${money} уйдут ${dative(first)}, вернуть их не получится. Бесплатная отмена была до ${fmtTime(freeUntil, tz)}.`}</Alert>}
      {!intro && pay && (l.status === 'pending' || l.status === 'unpaid') && <Alert tone="ok" icon="check" style={{ maxWidth: 'none' }} title="Деньги не списаны">{`${first} ещё не подтвердил(а) запись, заморозку снимем сразу.`}</Alert>}
      <Rules items={[
        { icon: 'check', on: !intro && free, text: `За 4 ч до начала и раньше вернём ${money} на ${cardLabel}.` },
        { icon: 'warn', on: !intro && !free && l.status === 'confirmed', text: 'Позже 4 ч деньги получит репетитор.' },
        { icon: 'gift', on: intro, text: 'Знакомство бесплатное: отменим запись и предупредим репетитора.' },
      ]} />
      <TextField label="Причина" optional="необязательно" value={why} onChange={setWhy} placeholder="Например, заболел(а)" className="r7-field" />
      <div className="r7-col">
        <Btn v="danger" onClick={() => {
          const ok = run(() => { booking.cancelByStudent(l.id, why.trim()); return true; });
          if (ok) { setCancel(false); toast(intro || free || l.status !== 'confirmed' ? 'Урок отменён' : `Урок отменён, ${money} получит ${first}`, { tone: 'ok' }); navigate('/my/lessons'); }
        }}>{l.status === 'pending' ? 'Отменить запись' : 'Отменить урок'}</Btn>
        <Btn onClick={() => setCancel(false)}>Оставить урок</Btn>
      </div>
    </Sheet>
  );

  const absentSheet = (
    <Sheet open={absent} onClose={() => setAbsent(false)} title={`${first} не пришёл(а)?`}>
      <span className="sub" style={{ marginTop: -6 }}>{nb(`Заморозим ${money} и передадим в поддержку. Решение за 3 рабочих дня, обычно это полный возврат.`)}</span>
      <div className="r7-col">
        <Btn v="primary" onClick={() => {
          const dp = run(() => booking.reportProblem(l.id, 'Репетитор не пришёл', '', [], 'tutor_absent'));
          if (dp) { setAbsent(false); navigate(`/disputes/${dp}`); }
        }}>Да, сообщить</Btn>
        <Btn onClick={() => setAbsent(false)}>Подожду ещё</Btn>
      </div>
    </Sheet>
  );

  /* ---------- blocks by state ---------- */
  let title = lessonTitle;
  let subTitle = '';
  let mTitle = intro ? 'Знакомство' : 'Урок';
  let main: ReactNode = null;
  let side: ReactNode = null;
  let phoneTail: ReactNode = null;

  const alternatives = () => {
    if (l.start <= at) return null;
    const list = d.tutors
      .filter(x => x.userId !== t.userId && tApi.isListed(x) && x.subjects.some(s => s.subject === l.subject) && schedule.slotAvailable(d, x, l.start, { minutes: l.minutes }))
      .slice(0, 2)
      .map(x => catalogItem(d, x));
    if (!list.length) return null;
    return (
      <div className="stack" style={{ gap: 12 }}>
        <h3 className="h3">{nb(`Свободны в ${fmtDayTime(l.start, tz)}`)}</h3>
        <TeacherGrid items={list} />
      </div>
    );
  };

  if (ph === 'pending') {
    mTitle = 'Запись отправлена';
    title = `Запись отправлена ${dative(first)}`;
    subTitle = intro ? 'Знакомство уже в «Моих уроках». Это бесплатно.' : 'Урок уже в «Моих уроках». Деньги заморожены, но не списаны.';
    main = card(
      <Note tone="action">{`${first} подтвердит до ${fmtDayTime(l.confirmDeadline, tz)}. Если не ответит, запись отменится сама${pay ? ' и заморозка снимется' : ''}.`}</Note>,
      <>{writeBtn()}<Btn size="m" onClick={() => setCancel(true)}>Отменить запись</Btn></>,
    );
    const items: TimelineItem[] = [{ state: 'done', title: 'Окно занято за вами', text: fmtDayTime(l.createdAt, tz) }];
    if (pay) items.push({ state: 'done', title: `${money} заморожены`, text: `${pay.method.kind === 'card' ? `Карта •• ${pay.method.last4}` : 'СБП'}, пока не списаны` });
    items.push({ state: 'cur', title: `${first} подтверждает`, text: `До ${fmtDayTime(l.confirmDeadline, tz)}, но не позже чем за 2 часа до урока` });
    items.push({ state: 'todo', title: intro ? 'Знакомство в календаре' : 'Списание и урок в календаре', text: pay ? `Спишем ${money} в момент подтверждения` : 'Пришлём письмо, когда репетитор подтвердит' });
    side = <section className="card"><h3 className="h3">Что дальше</h3><Timeline items={items} flat /></section>;
  } else if (ph === 'declined' || ph === 'expired') {
    mTitle = 'Запись';
    title = `${first} не сможет ${fmtDay(l.start, tz)}`;
    subTitle = pay ? 'Деньги не списаны, заморозка снята.' : 'Выберите другое время или другого репетитора.';
    const props = (l.decline?.proposals ?? []).filter(s => s > at);
    const okProposal = proposal && schedule.slotAvailable(d, t, proposal, { minutes: l.minutes, forStudentId: me.id, ignoreHorizon: true }) ? proposal : null;
    main = (
      <section className="card">
        <div className="row-s" style={{ gap: 6 }}>{ph === 'declined' ? <St tone="bad" icon="x">Отклонено</St> : <St tone="neutral" icon="clock">Не подтверждено вовремя</St>}{pay && <St tone="neutral" icon="check">Заморозка снята</St>}</div>
        <Person name={t.name} sub={`${fmtDayTime(l.start, tz)} · ${intro ? 'знакомство' : l.subject}`} tone={t.tone} src={t.photo} />
        {ph === 'declined' ? <div className="r4-quote">{nb(l.decline?.message ? `«${l.decline.message}»` : `Причина: ${l.decline?.reason.toLowerCase() ?? 'не указана'}`)}</div> : <div className="r4-quote">{nb(`${first} не ответил(а) до ${fmtDayTime(l.confirmDeadline, tz)}, поэтому запись отменилась сама.`)}</div>}
        {props.length > 0 && (
          <>
            <h3 className="h3">{`${first} предлагает`}</h3>
            <div className="slots r4-sl2" role="group" aria-label="Предложенное время">
              {props.map(s => <button key={s} type="button" className="slot" aria-pressed={proposal === s} onClick={() => setProposal(s)}>{slotLabel(s, tz)}</button>)}
            </div>
            <TzLine viewerTz={tz} otherTz={t.tz} otherName={genitive(first)} sample={proposal} />
            {proposal && !okProposal && <Note tone="bad" icon="warn">Это время уже заняли. Выберите другое.</Note>}
            <Btn v="primary" block disabled={!okProposal} onClick={() => okProposal && navigate(intro ? `/teachers/${t.slug}/intro` : checkoutUrl(t.slug, okProposal, l.minutes, l.subject, l.participant.childId ?? 'self'))}>Записаться на это время</Btn>
          </>
        )}
        <Btn block v={props.length ? 'gray' : 'primary'} to={intro ? `/teachers/${t.slug}/intro` : book}>{`Другое время у ${genitive(first)}`}</Btn>
      </section>
    );
    side = alternatives();
  } else if (ph === 'unpaid') {
    main = card(
      <Note tone="bad" icon="warn">{`Не получилось списать ${money}. Оплатите до ${fmtDayTime(l.start - 4 * 3600_000, tz)}, иначе занятие отменится.`}</Note>,
      <>{l.seriesId && <Btn v="primary" size="m" to={`/my/series/${l.seriesId}`}>Оплатить</Btn>}<Btn size="m" onClick={() => setCancel(true)}>Отменить</Btn></>,
    );
    side = <PaymentCard l={l} tz={tz} lessonState="Ждёт оплаты" />;
  } else if (ph === 'upcoming') {
    const r = l.reschedule?.status === 'pending' ? l.reschedule : null;
    const noteEl = l.link
      ? <Note icon="check">{`${first} добавил(а) ссылку${l.linkAt ? ` в ${fmtTime(l.linkAt, tz)}` : ''}.`}</Note>
      : <Note tone="action">{intro ? `${first} пришлёт ссылку перед знакомством. Мы сообщим на сайте и почтой.` : `${first} пришлёт ссылку перед уроком. Мы сообщим на сайте и почтой.`}</Note>;
    const canMove = free && l.status === 'confirmed' && !r;
    const acts = <>{l.link && <ConnectBtn l={l} />}{writeBtn()}{canMove && <Btn size="m" to={`/my/lessons/${l.id}/move`}>Перенести</Btn>}<Btn size="m" onClick={() => setCancel(true)}>Отменить урок</Btn></>;
    const moveIn = r && r.by === 'tutor' && (
      <div className="card">
        <Person name={t.name} sub="Просит перенести урок" tone={t.tone} src={t.photo} />
        <WasNew was={fmtDayTime(l.start, tz)} now={fmtDayTime(r.newStart, tz)} wasLabel="Было" newLabel="Предлагает" />
        <span className="small">{nb(intro ? 'Если откажетесь, знакомство останется в старое время.' : `Оплата ${money} перейдёт на новое время. Если откажетесь, урок останется в старое время.`)}</span>
        <div className="r7-btns">
          <Btn v="primary" size="m" onClick={() => run(() => booking.answerReschedule(l.id, true), 'Перенос принят')}>Принять</Btn>
          <Btn size="m" onClick={() => run(() => booking.answerReschedule(l.id, false), 'Урок остаётся в старое время')}>Оставить старое время</Btn>
        </div>
      </div>
    );
    const myMove = r && r.by === 'student' && <Note tone="action" icon="repeat">{`Вы предложили перенос на ${fmtDayTime(r.newStart, tz)}. Ждём ответа ${genitive(first)}, пока урок остаётся в старое время.`}</Note>;
    const rulesCard = (
      <div className="card">
        <div className="between"><b className="h3">Отмена и перенос</b><St tone="neutral" icon="clock">{`${free ? 'До' : 'После'} ${fmtTime(freeUntil, tz)}`}</St></div>
        {intro
          ? <Rules items={[{ icon: 'gift', on: true, text: 'Знакомство бесплатное: отменить можно в любой момент до начала.' }, { icon: 'repeat', text: `Перенести можно до ${fmtDayTime(freeUntil, tz)}, за 4 ч до начала.` }]} />
          : free
            ? <Rules items={[{ icon: 'check', on: true, text: `До ${fmtDayTime(freeUntil, tz)}, за 4 ч до начала, можно бесплатно отменить или перенести.` }, { icon: 'warn', text: `Позже при отмене ${money} получит ${first}.` }]} />
            : <Rules items={[{ icon: 'check', text: `До ${fmtDayTime(freeUntil, tz)}, за 4 ч до начала, можно было бесплатно отменить или перенести.` }, { icon: 'warn', on: true, text: `Сейчас до урока меньше 4 ч. Если отмените, ${money} получит ${first}.` }]} />}
      </div>
    );
    const remind = <div className="card"><Rules items={[{ icon: 'clock', on: true, text: 'Напомним за 24 ч и за 1 ч до урока, на сайте и почтой.' }]} /></div>;
    if (phone) {
      main = <>{moveIn}{card(<>{noteEl}{myMove}</>)}{rulesCard}<div className="r7-btns">{acts}</div></>;
      phoneTail = !intro && <><PaymentCard l={l} tz={tz} lessonState="Ждёт начала" /><MoneyTimeline l={l} tz={tz} tutorFirst={first} /></>;
    } else {
      main = <>{moveIn}{card(<>{noteEl}{myMove}</>, acts)}{rulesCard}</>;
      side = <>{!intro && <PaymentCard l={l} tz={tz} lessonState="Ждёт начала" />}{!intro && <MoneyTimeline l={l} tz={tz} tutorFirst={first} />}{remind}</>;
    }
  } else if (ph === 'live') {
    mTitle = 'Урок идёт';
    const noteEl = l.link ? <Note icon="check">{`${first} добавил(а) ссылку${l.linkAt ? ` в ${fmtTime(l.linkAt, tz)}` : ''}.`}</Note> : <Note tone="action">{`Ссылки пока нет. Напишите ${dative(first)} в чат.`}</Note>;
    const canAbsent = at >= rules.noShowFrom(l);
    const noTutor = !intro && (
      <div className="card">
        <b className="h3">{`${first} не подключился(ась)?`}</b>
        <span className="small">{nb(canAbsent ? 'Сообщите нам, деньги заморозим до решения поддержки. Решение за 3 рабочих дня.' : `Кнопка появится в ${fmtTime(rules.noShowFrom(l), tz)}, через 15 минут после начала. Деньги заморозим до решения поддержки.`)}</span>
        <div className="r7-btns"><Btn size="m" disabled={!canAbsent} onClick={() => setAbsent(true)}>Репетитор не пришёл</Btn></div>
      </div>
    );
    main = card(noteEl, phone ? (l.link ? <ConnectBtn l={l} block /> : writeBtn()) : <><ConnectBtn l={l} />{writeBtn()}</>);
    if (phone) phoneTail = noTutor;
    else side = <>{noTutor}<div className="card"><Rules items={[{ icon: 'clock', on: true, text: `Урок до ${fmtTime(l.end, tz)}. После него спросим, всё ли прошло хорошо.` }]} /></div></>;
  } else if (ph === 'awaiting') {
    const until = rules.answerUntil(l);
    const ask = (
      <div className="card">
        <b className="h2">Урок состоялся?</b>
        <span className="small">{nb(`Если не ответите, урок засчитается сам через 24 ч, в ${fmtDayTime(until, tz)}.`)}</span>
        <div className="r7-btns">
          <Btn v="primary" size="m" onClick={() => {
            const res = run(() => booking.confirmHappened(l.id));
            if (!res) return;
            if (res.askReview) navigate(`/my/lessons/${l.id}/review`);
            else toast(`Спасибо! ${first} получит оплату`, { tone: 'ok' });
          }}>Да, всё хорошо</Btn>
          <Btn size="m" to={`/my/lessons/${l.id}/problem`}>Сообщить о проблеме</Btn>
        </div>
      </div>
    );
    const path = (
      <Timeline items={[
        { state: 'done', title: `Оплачено ${money}`, text: pay ? fmtDayTime(pay.createdAt, tz) : '' },
        { state: 'done', title: 'Урок прошёл', text: fmtDayTime(l.start, tz) },
        { state: 'cur', title: 'Ждём вашего ответа', text: `До ${fmtDayTime(until, tz)}`, icon: 'help' },
        { state: 'todo', title: `${first} получит оплату`, text: 'Сразу после ответа' },
      ]} />
    );
    const sees = (
      <div className="card tint">
        <span className="small" style={{ color: 'var(--ink)', fontWeight: 700 }}>{`Так это видит ${first}`}</span>
        <b className="h3">Оплата придёт после вашего ответа</b>
        <span className="small" style={{ color: '#48484d' }}>{nb(`Когда вы подтвердите урок, но не позже ${fmtDayTime(until, tz)}.`)}</span>
      </div>
    );
    main = <>{card()}{ask}</>;
    if (phone) phoneTail = <>{path}{sees}</>;
    else side = <>{path}{sees}</>;
  } else if (ph === 'completed' && intro) {
    title = `Знакомство с ${instrumental(first)}`;
    const price = t.prices.find(p => p.minutes === 60) ?? t.prices[0];
    main = (
      <>
        <div className="card">
          <Person name={t.name} sub={`Знакомство · ${l.minutes} мин`} tone={t.tone} src={t.photo} />
          <div className="between"><b style={{ fontVariantNumeric: 'tabular-nums' }}>{nb(`${fmtDayTime(l.start, tz)}–${fmtTime(l.end, tz)}`)}</b><St tone="neutral" icon="check">Прошло</St></div>
        </div>
        <div className="card">
          <b className="h2">{`Продолжим с ${instrumental(first)}?`}</b>
          {price && <span className="small">{nb(`Урок ${price.minutes} мин стоит ${fmtMoney(studentPrice(price.price))}. Бесплатная отмена за 4 ч до начала.`)}</span>}
          <div className="r7-col">
            <Btn v="primary" size="m" to={book}>{phone || !price ? 'Записаться на урок' : `Записаться на урок · ${fmtMoney(studentPrice(price.price))}`}</Btn>
            <Btn size="m" to={`/teachers/${t.slug}/series`}>Заниматься регулярно</Btn>
            <Btn size="m" to="/teachers">Другие репетиторы</Btn>
          </div>
        </div>
      </>
    );
    side = <div className="card"><Rules items={[{ icon: 'repeat', on: true, text: `Регулярно: выберите дни и время один раз, ${first} подтвердит всю серию. Каждый урок спишем за 24 ч.` }, { icon: 'gift', text: 'Знакомство было бесплатным, поэтому отзыв о нём не просим.' }]} /></div>;
  } else if (ph === 'completed') {
    title = `Урок ${fmtDay(l.start, tz)}`;
    subTitle = `${t.name} · ${l.subject}, ${l.minutes} мин`;
    const review = d.reviews.find(rv => rv.lessonId === l.id);
    const canReview = l.tutorPrice > 0 && (!review || review.status === 'rejected');
    const slots = sel.nearestSlots(d, t, l.minutes, 2);
    const again = (
      <div className="card" style={{ gap: 14 }}>
        <div style={{ display: 'grid', gap: 2 }}><span className="h3">{`Ещё урок с ${instrumental(first)}`}</span><span className="small">{nb(`${l.subject}, ${l.minutes} мин, как в прошлый раз`)}</span></div>
        <Btn v="primary" size="m" block to={`${book}?subject=${encodeURIComponent(l.subject)}&minutes=${l.minutes}`}>Записаться снова</Btn>
        {slots.length > 0 && (
          <div className="r9-pick"><span>{`Ближайшие окна ${genitive(first)}`}</span>
            <div className="r9-slot2">{slots.map(s => <button key={s} className="slot" type="button" onClick={() => navigate(checkoutUrl(t.slug, s, l.minutes, l.subject, l.participant.childId ?? 'self'))}>{slotLabel(s, tz)}</button>)}</div>
          </div>
        )}
      </div>
    );
    const reviewBlock = review && review.status !== 'rejected'
      ? <div className="card" style={{ gap: 10 }}><div className="between"><span className="h3">Ваш отзыв</span>{review.status === 'published' ? <St tone="ok" icon="check">Опубликован</St> : <St tone="action" icon="clock">На проверке</St>}</div><span className="small">{nb(review.status === 'published' ? 'Отзыв уже в анкете. Спасибо!' : 'Проверяем обычно за сутки.')}</span></div>
      : canReview
        ? <div className="card" style={{ gap: 10 }}><span className="h3">Как прошёл урок?</span>{review?.status === 'rejected' ? <Note tone="bad" icon="warn">{`Отзыв не прошёл проверку: ${review.reason}. Исправьте и отправьте снова.`}</Note> : <span className="small">Отзыв поможет другим ученикам</span>}<div><Btn size="s" to={`/my/lessons/${l.id}/review`}>{review ? 'Исправить отзыв' : 'Оставить отзыв'}</Btn></div></div>
        : null;
    const items: TimelineItem[] = [
      ...(pay ? [{ state: 'done' as const, title: `Оплачено ${money}`, text: fmtDayTime(pay.createdAt, tz) }] : []),
      { state: 'done', title: 'Урок прошёл', text: fmtDayTime(l.start, tz) },
      { state: 'done', title: l.studentAnswer?.ok ? 'Вы подтвердили урок' : 'Урок засчитан', text: `${first} получил(а) оплату` },
    ];
    if (phone) {
      main = <>{card()}{again}{reviewBlock}</>;
    } else {
      main = <>{card(undefined, <>{canReview && <Btn size="m" to={`/my/lessons/${l.id}/review`}>Оставить отзыв</Btn>}{writeBtn()}</>)}<Timeline items={items} />{review && reviewBlock}</>;
      side = again;
    }
  } else if (ph === 'no_show') {
    const until = (l.noShowAt ?? at) + 24 * 3600_000;
    const can = at < until && !l.disputeId;
    main = card(<Note tone="bad" icon="warn">{`${first} отметил(а), что вы не пришли. ${intro ? '' : `${money} получит ${first}.`}`}</Note>);
    side = can && !intro
      ? <div className="card"><b className="h3">Вы были на уроке?</b><span className="small">{nb(`Оспорьте до ${fmtDayTime(until, tz)}. Деньги заморозим до решения поддержки.`)}</span><div className="r7-btns"><Btn v="primary" size="m" to={`/my/lessons/${l.id}/problem?source=no_show`}>Оспорить неявку</Btn>{writeBtn()}</div></div>
      : <PaymentCard l={l} tz={tz} lessonState="Неявка" />;
  } else if (ph === 'disputed') {
    const dp = d.disputes.find(x => x.id === l.disputeId);
    main = card(<Note tone="action" icon="help">{`Поддержка разбирается. ${money} заморожены до решения${dp ? `, не позже ${fmtDay(dp.decideBy, tz)}` : ''}.`}</Note>, dp && <Btn v="primary" size="m" to={`/disputes/${dp.id}`}>Открыть спор</Btn>);
    side = <PaymentCard l={l} tz={tz} lessonState="Спор" />;
  } else if (ph === 'cancelled') {
    const c = l.cancel;
    const text = c?.by === 'tutor'
      ? `${first} отменил(а) урок${c.reason ? `: ${c.reason.toLowerCase()}` : ''}.${pay ? ` Вернём ${money} полностью, обычно за 1–5 рабочих дней.` : ''}`
      : c?.by === 'system'
        ? `Урок отменился сам${c.reason ? `: ${c.reason.toLowerCase()}` : ''}.${pay ? ' Деньги не списаны.' : ''}`
        : `Вы отменили урок${c?.reason ? `: ${c.reason.toLowerCase()}` : ''}.${pay ? (c?.refund ? ' Деньги вернули.' : ` Отмена поздняя, ${money} получил(а) ${first}.`) : ''}`;
    main = card(<Note tone={c?.by === 'tutor' ? 'action' : undefined} icon="x">{text}</Note>, <Btn v="primary" size="m" to={intro ? `/teachers/${t.slug}/intro` : book}>Выбрать другое время</Btn>);
    side = !intro && pay ? <PaymentCard l={l} tz={tz} lessonState="Отменён" /> : alternatives();
  }

  const head = (
    <div className="title-block">
      <h1 className="h1">{nb(title)}</h1>
      {subTitle && <p className="sub">{nb(subTitle)}</p>}
    </div>
  );

  if (phone)
    return (
      <Page title={title} back="/my/lessons" mTitle={mTitle} right={<IBtn icon="chat" label={`Чат с ${instrumental(first)}`} onClick={openChat} />} className="r4">
        {(ph === 'declined' || ph === 'expired' || ph === 'pending') && head}
        {main}
        {side}
        {phoneTail}
        {cancelSheet}{absentSheet}
      </Page>
    );
  return (
    <Page title={title} kind="cabinet" side="Мои уроки" className="r4">
      <BackBtn to="/my/lessons" label="Мои уроки" />
      {head}
      <div className="cols c2">
        <div className="r7-col" style={{ gap: 16 }}>{main}</div>
        <div className="r7-col" style={{ gap: 16 }}>{side}</div>
      </div>
      {cancelSheet}{absentSheet}
    </Page>
  );
}
