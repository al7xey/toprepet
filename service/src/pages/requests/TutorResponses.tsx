import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Empty, Seg, St } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useDb, useSession, findPairChat } from '../../api';
import type { RequestResponse } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { countLabel, fmtDay, fmtDayTime } from '../../lib/time';

type Tab = 'all' | 'wait' | 'archive';

export default function TutorResponses() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const all = d.responses.filter(x => x.tutorId === me.id).sort((a, b) => b.createdAt - a.createdAt);
  const isWait = (x: RequestResponse) => x.status === 'sent' || x.status === 'viewed';
  const list = all.filter(x => (tab === 'all' ? true : tab === 'wait' ? isWait(x) : !isWait(x)));
  const status = (x: RequestResponse) => {
    const req = d.requests.find(r => r.id === x.requestId);
    if (x.status === 'booked') return <St tone="ok" icon="check">Ученик записался</St>;
    if (x.status === 'declined') return <St>Отклонён</St>;
    if (x.status === 'other' || req?.closedReason === 'booked') return <St>Выбрал другого</St>;
    if (req?.status === 'closed') return <St>Заявка закрыта</St>;
    if (x.status === 'viewed') return <St icon="eye">Просмотрен</St>;
    return <St tone="action" icon="send">Отправлен</St>;
  };
  const card = (x: RequestResponse) => {
    const req = d.requests.find(r => r.id === x.requestId);
    const lesson = x.status === 'booked' ? d.lessons.find(l => l.responseId === x.id) : undefined;
    const chat = req && findPairChat(d, req.studentId, me.id);
    const meta = lesson ? `${fmtDay(x.createdAt, me.tz)} · ${fmtMoney(x.price)} · урок ${fmtDayTime(lesson.start, me.tz)}` : `${fmtDay(x.createdAt, me.tz)} · ${fmtMoney(x.price)} · ${countLabel(x.slots.length, 'окно', 'окна', 'окон')}${req?.status === 'closed' && x.status !== 'booked' ? ' · заявка закрыта' : ''}`;
    return (
      <article className="card" style={{ gap: 10 }} key={x.id}>
        <div className="r5-rqtop"><h3 style={{ fontSize: 17, fontWeight: 750 }}>{req?.title ?? 'Заявка удалена'}</h3>{status(x)}</div>
        <div className="r5-mfoot">
          <span className="small">{nb(meta)}</span>
          {lesson ? <Btn size="s" to={`/tutor/lessons/${lesson.id}`}>Урок</Btn> : chat && <Btn size="s" onClick={() => navigate(`/messages/${chat.id}`)}>Чат</Btn>}
        </div>
      </article>
    );
  };
  const waitN = all.filter(isWait).length;
  const seg = <Seg<Tab> label="Отклики" value={tab} onChange={setTab} items={[{ value: 'all', label: `Все · ${all.length}` }, { value: 'wait', label: `Ждут ответа · ${waitN}` }, ...(phone ? [] : [{ value: 'archive' as Tab, label: 'Архив' }])]} />;
  const body = list.length ? list.map(card) : <Empty icon="send" title={all.length ? 'Здесь пусто' : 'Откликов пока нет'} style={{ maxWidth: 'none' }} action={<Btn v="primary" to="/tutor/requests">К заявкам</Btn>}>Откликайтесь на заявки учеников своей ценой и окнами.</Empty>;
  if (phone)
    return (
      <Page title="Мои отклики" back="/tutor/requests" className="r5">
        <div>{seg}</div>
        {body}
        {list.length > 0 && <Btn block to="/tutor/requests">К заявкам</Btn>}
      </Page>
    );
  return (
    <Page title="Мои отклики" kind="cabinet" side="Заявки" className="r5">
      <div className="r5-head"><h1 className="h1">Мои отклики</h1><Btn to="/tutor/requests">К заявкам</Btn></div>
      <div style={{ justifySelf: 'start' }}>{seg}</div>
      {list.length ? <div className="cols half">{body}</div> : body}
    </Page>
  );
}
