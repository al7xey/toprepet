import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Btn, Confirm, Empty, Note, Sheet, St } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, requests as rq, tutorById } from '../../api';
import type { LessonRequest } from '../../api/types';
import { nb } from '../../lib/text';
import { dative } from '../../lib/names';
import { DAY, countLabel, fmtDateShort, fmtDayTime } from '../../lib/time';

export function Bar10({ n, of = 10 }: { n: number; of?: number }) {
  return <div className="r5-bar" aria-label={`${n} из ${of} откликов`} role="img">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < Math.round((n / of) * 10) ? 'on' : undefined} />)}</div>;
}

export function requestStatus(r: LessonRequest, at: number) {
  switch (r.status) {
    case 'active':
      return (r.expiresAt ?? 0) > at ? <St tone="ok" icon="check">Активна</St> : <St icon="clock">Закончилась</St>;
    case 'paused':
      return <St icon="pause">На паузе</St>;
    case 'hidden':
      return <St tone="action" icon="eye">Скрыта</St>;
    case 'expired':
      return <St icon="clock">Закончилась</St>;
    default:
      return <St>Закрыта</St>;
  }
}

export const daysLeft = (r: LessonRequest, at: number) => countLabel(Math.max(1, Math.ceil(((r.expiresAt ?? at) - at) / DAY)), 'день', 'дня', 'дней');

export default function MyRequests() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const [sp, setSp] = useSearchParams();
  const { run } = useApp();
  const [closing, setClosing] = useState<LessonRequest | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const mine = d.requests.filter(r => r.studentId === me.id && r.status !== 'draft').sort((a, b) => Number(['closed'].includes(a.status)) - Number(['closed'].includes(b.status)) || b.createdAt - a.createdAt);
  const expiredAsk = mine.find(r => r.id === sp.get('expired') && r.status === 'expired') ?? mine.find(r => r.status === 'expired' && r.expiryAsked && !dismissed.includes(r.id));
  const recentBooked = mine.find(r => r.closedReason === 'booked' && (r.closedAt ?? 0) > at - 3 * DAY);
  const bookedLesson = recentBooked && d.lessons.find(l => l.requestId === recentBooked.id && l.studentId === me.id);
  const bookedTutor = recentBooked && tutorById(d, recentBooked.bookedTutorId);

  const card = (r: LessonRequest) => {
    const n = rq.responseCount(d, r.id);
    const fresh = d.responses.filter(x => x.requestId === r.id && x.status === 'sent').length;
    const closed = r.status === 'closed';
    const tutor = r.bookedTutorId ? tutorById(d, r.bookedTutorId) : undefined;
    return (
      <article className="card r5-rqrow" key={r.id}>
        <div className="r5-rqtop"><h3>{r.title}</h3>{requestStatus(r, at)}</div>
        {closed ? (
          <div className="r5-meta">
            {r.closedReason === 'booked' ? <span><Icon name="check" />{tutor ? `Вы записались к ${dative(tutor.name.split(' ')[0])}` : 'Вы записались'}</span> : <span><Icon name="x" />Вы закрыли заявку</span>}
            <span><Icon name="cal" />{`закрыта ${fmtDateShort(r.closedAt ?? r.createdAt, me.tz)}`}</span>
            {r.closedReason === 'booked' && n > 1 && <span><Icon name="send" />{`Уведомили ${countLabel(n - 1, 'репетитора', 'репетиторов', 'репетиторов')}`}</span>}
          </div>
        ) : (
          <>
            <div className="r5-meta">
              <span><Icon name="inbox" />{n >= r.responseLimit ? countLabel(n, 'отклик', 'отклика', 'откликов') : `${countLabel(n, 'отклик', 'отклика', 'откликов')} из ${r.responseLimit}`}</span>
              {r.status !== 'expired' && <span><Icon name="clock" />{`ещё ${daysLeft(r, at)}`}</span>}
              <span><Icon name="video" />{nb(`${r.format === 'online' ? 'онлайн' : 'очно'}, ${rq.fmtBudget(r.budget)}`)}</span>
            </div>
            <Bar10 n={n} of={r.responseLimit} />
            {r.status === 'hidden' && <Note tone="action">{`Новые репетиторы её не видят, пока вы не выберете кого-то или не примете ещё 10 откликов.`}</Note>}
            {r.status === 'paused' && <Note icon="pause">Репетиторы не видят заявку, пока она на паузе. Отклики сохранились.</Note>}
            {r.status === 'expired' && <Note tone="action" icon="clock">Заявка закончилась. Продлите на 14 дней, чтобы получить новые отклики.</Note>}
            <div className="r5-acts">
              <Btn v={r.status === 'hidden' ? 'tinted' : n ? 'primary' : 'gray'} to={`/my/requests/${r.id}`}>{n ? `Отклики · ${n}${fresh ? ` (новых ${fresh})` : ''}` : 'Откликов пока нет'}</Btn>
              {r.status === 'hidden' && <Btn onClick={() => run(() => rq.moreResponses(r.id), 'Заявка снова видна репетиторам, ждём ещё 10 откликов')}>Принять ещё 10 откликов</Btn>}
              {r.status === 'expired' && <Btn v="primary" onClick={() => run(() => rq.extendRequest(r.id), 'Заявка продлена на 14 дней')}>Продлить на 14 дней</Btn>}
              {(r.status === 'active' || r.status === 'paused') && <Btn to={`/requests/${r.id}/edit`}>Изменить</Btn>}
              {r.status === 'active' && <Btn onClick={() => run(() => rq.pauseRequest(r.id), 'Заявка на паузе')}>Пауза</Btn>}
              {r.status === 'paused' && <Btn onClick={() => run(() => rq.resumeRequest(r.id), 'Заявка снова видна репетиторам')}>Возобновить</Btn>}
              <Btn onClick={() => setClosing(r)}>Закрыть</Btn>
            </div>
          </>
        )}
      </article>
    );
  };

  const bookedAlert = recentBooked && bookedTutor && (
    <Alert tone="ok" icon="check" title={`Вы записались к ${dative(bookedTutor.name.split(' ')[0])}`} style={{ maxWidth: 'none' }} action={bookedLesson && <Btn v="white" size="s" to={`/my/lessons/${bookedLesson.id}`}>Детали записи</Btn>}>
      {`${bookedLesson ? `${fmtDayTime(bookedLesson.start, me.tz)}. ` : ''}Заявка «${recentBooked.title}» закрылась сама, остальным репетиторам мы вежливо сообщили.`}
    </Alert>
  );
  const list = mine.length ? mine.map(card) : (
    <Empty icon="doc" title="Заявок пока нет" action={<Btn v="primary" icon="plus" to="/requests/new">Создать заявку</Btn>} style={{ maxWidth: 'none' }}>Опишите задачу и бюджет — репетиторы сами предложат цену и время.</Empty>
  );
  const expireSheet = expiredAsk && (
    <Sheet open onClose={() => { setDismissed(x => [...x, expiredAsk.id]); if (sp.get('expired')) setSp({}, { replace: true }); }} className="r5">
      <div className="r5-ill"><Icon name="clock" /></div>
      <h4 className="h2" style={{ fontSize: 20 }}>{`Заявка «${expiredAsk.title}» закончилась`}</h4>
      <p className="sub" style={{ color: '#48484d' }}>{nb(`За 14 дней пришло ${countLabel(rq.responseCount(d, expiredAsk.id), 'отклик', 'отклика', 'откликов')}. Продлить ещё на 14 дней? Отклики останутся в чатах в любом случае.`)}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        <Btn v="primary" block onClick={() => { run(() => rq.extendRequest(expiredAsk.id), 'Заявка продлена на 14 дней'); setSp({}, { replace: true }); }}>Продлить на 14 дней</Btn>
        <Btn block onClick={() => { run(() => rq.closeRequest(expiredAsk.id), 'Заявка закрыта'); setSp({}, { replace: true }); }}>Закрыть заявку</Btn>
      </div>
    </Sheet>
  );
  const confirm = (
    <Confirm open={!!closing} title="Закрыть заявку?" text="Репетиторы перестанут её видеть. Переписка с откликнувшимися останется в чатах." confirm="Закрыть заявку" danger onClose={() => setClosing(null)} onConfirm={() => { const r = closing!; setClosing(null); run(() => rq.closeRequest(r.id), 'Заявка закрыта'); }} />
  );
  if (phone)
    return (
      <Page title="Мои заявки" kind="cabinet" tab="Заявки" className="r5">
        <div className="between"><h1 className="h1">Мои заявки</h1><Btn v="white" size="s" icon="plus" to="/requests/new">Новая</Btn></div>
        {bookedAlert}{list}{expireSheet}{confirm}
      </Page>
    );
  return (
    <Page title="Мои заявки" kind="cabinet" side="Мои заявки" className="r5">
      <div className="r5-head"><div className="title-block"><h1 className="h1">Мои заявки</h1><p className="sub">Можно держать несколько заявок по разным предметам.</p></div><Btn v="white" size="m" icon="plus" to="/requests/new">Новая заявка</Btn></div>
      {bookedAlert}{list}{expireSheet}{confirm}
    </Page>
  );
}
