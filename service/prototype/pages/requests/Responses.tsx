import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Ava, Btn, Confirm, Empty, Kv, Note, St, Tz } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, chat, requests as rq, reviews as rv, schedule, tutors as tApi, tutorById } from '../../api';
import type { RequestResponse } from '../../api/types';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { countLabel, fmtTime, utcLabel, weekdayShort, zoneCity, zoned, NB } from '../../lib/time';
import { checkoutUrl } from '../booking/Pick';
import { Bar10, daysLeft, requestStatus } from './MyRequests';

export default function Responses() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [more, setMore] = useState(false);
  const [declining, setDeclining] = useState<RequestResponse | null>(null);
  const [closing, setClosing] = useState(false);
  const r = d.requests.find(x => x.id === id && x.studentId === me.id);
  useEffect(() => {
    if (r) rq.viewResponses(r.id);
  }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <Page title="Отклики" back="/my/requests"><Empty icon="doc" title="Заявка не найдена" action={<Btn to="/my/requests">Мои заявки</Btn>} /></Page>;
  const all = d.responses.filter(x => x.requestId === r.id).sort((a, b) => a.createdAt - b.createdAt);
  const active = all.filter(x => x.status !== 'declined');
  const shown = more ? active : active.slice(0, 3);
  const tz = me.tz;
  const closed = r.status === 'closed';

  const respCard = (x: RequestResponse, i: number) => {
    const t = tutorById(d, x.tutorId);
    if (!t) return null;
    const rating = rv.tutorRating(d, t.userId);
    const free = x.slots.filter(s => s > at && schedule.slotAvailable(d, t, s, { minutes: 60, ignoreHorizon: true, ignoreNotice: true, forStudentId: me.id }));
    const sel = picked[x.id] ?? (i === 0 && !closed ? free[0] : undefined);
    const price = studentPrice(x.price);
    const intro = t.intro.enabled && !booking.introUsed(d, me.id, t.userId);
    const openChat = () => { const c = run(() => chat.openChatWithTutor(t.userId)); if (c) navigate(`/messages/${c}`); };
    return (
      <article className="card" style={{ gap: 14 }} key={x.id}>
        <div className="r5-who">
          <Ava tone={t.tone} src={t.photo} />
          <div className="r5-nm"><b>{t.name}</b><span className="r5-rt">{rating.count ? <><Icon name="star" style={{ width: 14, height: 14, color: 'var(--accent)' }} />{nb(`${rv.fmtRating(rating.avg)} · ${countLabel(rating.count, 'отзыв', 'отзыва', 'отзывов')}`)}</> : tApi.docsVerified(t) ? <><Icon name="shield" style={{ width: 14, height: 14, color: 'var(--green)' }} />Документы проверены</> : `Опыт ${countLabel(t.experienceYears, 'год', 'года', 'лет')}`}</span></div>
          <div className="r5-pr"><b>{fmtMoney(price)}</b><span>за 60 мин</span></div>
        </div>
        {x.status === 'booked' && <St tone="ok" icon="check">Вы записались</St>}
        <div className="r5-quote">{nb(x.message)}</div>
        {!closed && (
          <div className="r5-sec" style={{ gap: 8 }}>
            <span className="small" style={{ fontWeight: 700 }}>{`Окна для записи · ${tz === 'Europe/Moscow' ? 'по Москве' : `ваше время, ${zoneCity(tz)}`}`}</span>
            {free.length ? (
              <div className="r5-slots">
                {x.slots.map(s => {
                  const ok = free.includes(s);
                  const p = zoned(s, tz);
                  return <button key={s} type="button" className="slot r5-slot" disabled={!ok} aria-pressed={ok ? sel === s : undefined} onClick={() => setPicked(v => ({ ...v, [x.id]: s }))}><small>{`${weekdayShort(p.weekday)}${NB}${p.day}`}</small>{fmtTime(s, tz)}</button>;
                })}
              </div>
            ) : <Note>Предложенные окна уже прошли или заняты. Выберите другое время в расписании репетитора.</Note>}
            {sel && <Btn v="primary" block onClick={() => navigate(checkoutUrl(t.slug, sel, 60, r.subject, 'self', x.id))}>{`Записаться · ${fmtMoney(price)}`}</Btn>}
          </div>
        )}
        <div className="r5-acts">
          {intro && !closed && <Btn v="tinted" size="s" to={`/teachers/${t.slug}/intro`}>{`Знакомство ${t.intro.minutes} мин`}</Btn>}
          {!free.length && !closed && <Btn v="tinted" size="s" to={`/teachers/${t.slug}/book?subject=${encodeURIComponent(r.subject)}&minutes=60`}>Другое время</Btn>}
          <Btn size="s" to={`/teachers/${t.slug}`}>Анкета</Btn>
          <Btn size="s" onClick={openChat}>Задать вопрос</Btn>
          {!closed && x.status !== 'booked' && <Btn v="white" size="s" onClick={() => setDeclining(x)}>Отклонить</Btn>}
        </div>
      </article>
    );
  };
  const n = all.length;
  const list = active.length ? (
    <>
      {shown.map(respCard)}
      {active.length > shown.length && <Btn block onClick={() => setMore(true)}>{`Показать ещё ${countLabel(active.length - shown.length, 'отклик', 'отклика', 'откликов')}`}</Btn>}
    </>
  ) : <Empty icon="inbox" title="Откликов пока нет" style={{ maxWidth: 'none' }}>Подходящие репетиторы уже получили уведомление. Обычно первые отклики приходят в течение дня.</Empty>;
  const meta = (
    <div className="r5-meta">
      <span><Icon name="inbox" />{`${countLabel(n, 'отклик', 'отклика', 'откликов')} из ${r.responseLimit}`}</span>
      {!closed && r.status !== 'expired' && <span><Icon name="clock" />{`ещё ${daysLeft(r, at)}`}</span>}
    </div>
  );
  const modals = (
    <>
      <Confirm open={!!declining} title="Отклонить отклик?" text="Репетитор получит вежливое уведомление. Переписка в чате останется." confirm="Отклонить" danger onClose={() => setDeclining(null)} onConfirm={() => { const x = declining!; setDeclining(null); run(() => rq.declineResponse(x.id), 'Отклик отклонён'); }} />
      <Confirm open={closing} title="Закрыть заявку?" text="Репетиторы перестанут её видеть. Переписка с откликнувшимися останется в чатах." confirm="Закрыть заявку" danger onClose={() => setClosing(false)} onConfirm={() => { setClosing(false); run(() => rq.closeRequest(r.id), 'Заявка закрыта'); }} />
    </>
  );
  if (phone)
    return (
      <Page title="Отклики" back="/my/requests" className="r5">
        <div style={{ display: 'grid', gap: 6 }}><h1 className="h2">{r.title}</h1>{meta}</div>
        {list}
        {modals}
      </Page>
    );
  return (
    <Page title="Отклики" kind="cabinet" side="Мои заявки" className="r5">
      <div><Btn size="s" icon="left" to="/my/requests">Мои заявки</Btn></div>
      <div className="cols c2" style={{ gridTemplateColumns: 'minmax(0,1fr) 300px' }}>
        <div className="stack" style={{ minWidth: 0 }}>
          <h1 className="h2">{n ? countLabel(n, 'отклик', 'отклика', 'откликов') : 'Отклики'}</h1>
          {list}
        </div>
        <aside className="card r5-stick" style={{ gap: 14 }}>
          <div className="h3">{r.title}</div>
          <span style={{ justifySelf: 'start' }}>{r.status === 'active' ? <St tone="ok" icon="check">{`Активна · ещё ${daysLeft(r, at)}`}</St> : requestStatus(r, at)}</span>
          <Kv className="r5-kvr" rows={[['Уровень', r.level], ['Бюджет', rq.fmtBudget(r.budget)], ['Формат', r.format === 'online' ? 'Онлайн' : 'Очно'], ['Частота', r.frequency]]} />
          <div style={{ display: 'grid', gap: 6 }}><span className="small">{`${countLabel(n, 'отклик', 'отклика', 'откликов')} из ${r.responseLimit}`}</span><Bar10 n={n} of={r.responseLimit} /></div>
          <Note>После записи заявка закроется сама, остальным мы вежливо сообщим.</Note>
          <Tz>{`Время ваше, ${zoneCity(tz)} (${utcLabel(tz)})`}</Tz>
          {!closed && <div className="r5-acts"><Btn size="s" to={`/requests/${r.id}/edit`}>Изменить</Btn><Btn size="s" onClick={() => setClosing(true)}>Закрыть</Btn></div>}
        </aside>
      </div>
      {modals}
    </Page>
  );
}
