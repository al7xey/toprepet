import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ava, Btn, Chip, Empty, Field, Input, Kv, Note, St, Textarea } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, booking, lessonById, tutorById, userById, findPairChat } from '../../api';
import type { Dispute } from '../../api/types';
import { fmtMoney, parseMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { DAY, fmtDateShort, fmtDayTime, fmtDuration, fmtTime, MSK } from '../../lib/time';
import { ShotList } from '../lessons/shared';
import { AdminPage } from './shared';

export default function AdminDisputes() {
  const { id } = useParams();
  const d = useDb();
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [comment, setComment] = useState('');
  const [partial, setPartial] = useState('');
  const [showPartial, setShowPartial] = useState(false);
  const open = d.disputes.filter(x => x.status === 'open').sort((a, b) => a.decideBy - b.decideBy);
  const resolved = d.disputes.filter(x => x.status === 'resolved').sort((a, b) => (b.resolution?.at ?? 0) - (a.resolution?.at ?? 0));
  const list = tab === 'open' ? open : resolved;
  const cur = d.disputes.find(x => x.id === id) ?? (phone ? undefined : list[0]);
  const tz = MSK;
  const label = (dp: Dispute) => {
    const l = lessonById(d, dp.lessonId);
    const st = userById(d, dp.studentId);
    const t = tutorById(d, dp.tutorId);
    return { l, st, t, title: l ? `Урок ${fmtDateShort(l.start, tz)}` : 'Урок', pair: `${l?.participant.name ?? st?.name ?? ''} → ${t?.name ?? ''}`, paid: l ? l.studentPrice - l.discount : 0 };
  };
  const timer = (dp: Dispute) => {
    if (dp.status === 'resolved') return <St tone="ok" icon="check">Решён</St>;
    const left = dp.decideBy - at;
    return left < DAY ? <St tone="bad" icon="warn">{`до ${fmtDayTime(dp.decideBy, tz)}`}</St> : <St tone={left < 2 * DAY ? 'action' : 'neutral'} icon="clock">{fmtDuration(left).replace(/ \d+\s?ч$/, '')}</St>;
  };
  const queue = (
    <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
      {list.map(dp => { const x = label(dp); return <Link key={dp.id} to={`/admin/disputes/${dp.id}`} className={`r8-qi${cur?.id === dp.id ? ' on' : ''}`} onClick={() => { setComment(''); setPartial(''); setShowPartial(false); }}><b>{x.title}</b><span>{nb(`${x.pair} · ${fmtMoney(x.paid)}`)}</span><span>{timer(dp)}</span></Link>; })}
      {!list.length && <Empty icon="check" title={tab === 'open' ? 'Открытых споров нет' : 'Решённых пока нет'} style={{ maxWidth: 'none' }} />}
    </div>
  );
  const tabs = <div className="row-s"><Chip pressed={tab === 'open'} onClick={() => setTab('open')}>{`Открытые · ${open.length}`}</Chip><Chip pressed={tab === 'resolved'} onClick={() => setTab('resolved')}>Решённые</Chip></div>;

  const detail = cur && (() => {
    const x = label(cur);
    const l = x.l!;
    const chat = findPairChat(d, cur.studentId, cur.tutorId);
    const msgs = chat ? d.messages.filter(m => m.chatId === chat.id && m.createdAt >= l.start - DAY && m.createdAt <= l.end + DAY).sort((a, b) => a.createdAt - b.createdAt) : [];
    const evid: [number, string, boolean][] = [];
    if (l.linkAt) evid.push([l.linkAt, `${x.t?.name.split(' ')[0]} прислал(а) ссылку на урок`, false]);
    evid.push([l.start, 'Начало урока по расписанию', false]);
    if (l.noShowAt) evid.push([l.noShowAt, 'Репетитор отметил неявку ученика', true]);
    evid.push([l.end, 'Конец урока по расписанию', false]);
    evid.push([cur.createdAt, `${l.participant.name}: «${cur.reason}»`, true]);
    if (cur.tutorAnswer) evid.push([cur.tutorAnswer.at, 'Репетитор ответил по спору', false]);
    evid.sort((a, b) => a[0] - b[0]);
    const decide = (kind: 'refund_full' | 'refund_partial' | 'pay_tutor') => {
      const ok = run(() => { booking.resolveDispute(cur.id, kind, parseMoney(partial), comment); return true; }, 'Решение принято, деньги уходят автоматически');
      if (ok) { setComment(''); setPartial(''); setShowPartial(false); navigate('/admin/disputes'); }
    };
    const sides = (
      <div className="cols half">
        <div className="r8-party"><Ava tone={x.st?.tone ?? 'teal'} src={x.st?.photo} /><div><b>{`Ученик: ${l.participant.name}`}</b><span className="q">{nb(`«${cur.reason}${cur.details ? `. ${cur.details}` : ''}»`)}</span><ShotList shots={cur.shots} /></div></div>
        <div className="r8-party"><Ava tone={x.t?.tone ?? 'orange'} src={x.t?.photo} /><div><b>{`Репетитор: ${x.t?.name ?? ''}`}</b>{cur.tutorAnswer ? <><span className="q">{nb(`«${cur.tutorAnswer.text}»`)}</span><ShotList shots={cur.tutorAnswer.shots} /></> : <span className="q wait">{at > cur.tutorDeadline ? 'Не ответил(а) за 24 часа' : `Ответит до ${fmtDayTime(cur.tutorDeadline, tz)}`}</span>}</div></div>
      </div>
    );
    const history = (
      <div className="card">
        <div className="between"><span className="h3">История урока</span>{chat && <Btn size="s" onClick={() => document.getElementById('adm-chat')?.scrollIntoView({ behavior: 'smooth' })}>Переписка</Btn>}</div>
        <div className="r8-evid">{evid.map(([ts, text, hl], i) => <div key={i}><time>{fmtTime(ts, tz)}</time><span className={hl ? 'hl' : undefined}>{nb(`${text} · ${fmtDateShort(ts, tz)}`)}</span></div>)}</div>
        {msgs.length > 0 && (
          <div id="adm-chat" style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto', background: 'var(--bg)', borderRadius: 18, padding: 10 }}>
            {msgs.filter(m => m.kind === 'text').map(m => <div key={m.id} className={`msg ${m.authorId === cur.studentId ? 'msg--in' : 'msg--out'}`} style={{ maxWidth: '86%' }}>{nb(m.text ?? '')}<time>{fmtDayTime(m.createdAt, tz)}</time></div>)}
          </div>
        )}
      </div>
    );
    const decision = cur.status === 'open' ? (
      <div className="card">
        <Field label="Комментарий для сторон" htmlFor="adm-cm" style={{ maxWidth: 'none' }}><Textarea id="adm-cm" value={comment} onChange={e => setComment(e.target.value)} placeholder="Почему так решили…" style={{ minHeight: 90 }} /></Field>
        <div style={{ display: 'grid', gap: 8 }}>
          <Btn v="primary" size="m" block onClick={() => decide('refund_full')}>{`Полный возврат ${fmtMoney(x.paid)}`}</Btn>
          {showPartial ? (
            <div className="row-s" style={{ flexWrap: 'nowrap' }}><Input inputMode="numeric" placeholder="Сумма возврата, ₽" value={partial} onChange={e => setPartial(e.target.value.replace(/\D/g, ''))} aria-label="Сумма частичного возврата" /><Btn size="m" disabled={!parseMoney(partial)} onClick={() => decide('refund_partial')}>Вернуть</Btn></div>
          ) : <Btn size="m" block onClick={() => setShowPartial(true)}>Частичный возврат</Btn>}
          <Btn size="m" block onClick={() => decide('pay_tutor')}>{`Оплатить репетитору ${fmtMoney(l.tutorPrice)}`}</Btn>
        </div>
        <Note>Деньги уходят автоматически: возврат на карту ученика, перевод репетитору. Обе стороны получат уведомление и письмо.</Note>
      </div>
    ) : cur.resolution && (
      <div className="card"><span className="h3">Решение</span><Kv rows={[['Итог', cur.resolution.kind === 'refund_full' ? 'Полный возврат' : cur.resolution.kind === 'pay_tutor' ? 'Оплата репетитору' : 'Частичный возврат'], ['Возврат ученику', fmtMoney(cur.resolution.refund)], ['Когда', fmtDayTime(cur.resolution.at, tz)]]} />{cur.resolution.comment && <Note>{cur.resolution.comment}</Note>}</div>
    );
    const head = (
      <div className="card" style={{ padding: 22 }}>
        <div className="between"><div style={{ display: 'grid', gap: 2 }}><span className="h2">{x.pair}</span><span className="small">{nb(`${l.subject}, ${l.minutes} мин · ${fmtDayTime(l.start, tz)}–${fmtTime(l.end, tz)} МСК · № ${cur.number}`)}</span></div><span className="money" style={{ fontSize: 24 }}>{fmtMoney(x.paid)}</span></div>
        <div className="row-s"><St tone="action" icon="help">{cur.reason}</St>{cur.status === 'open' ? <St icon="clock">{`Решить до ${fmtDayTime(cur.decideBy, tz)}`}</St> : <St tone="ok" icon="check">Решён</St>}</div>
        {sides}
      </div>
    );
    return phone ? <>{head}{history}{decision}</> : <>{head}<div className="cols half" style={{ alignItems: 'start' }}>{history}{decision}</div></>;
  })();

  if (phone)
    return (
      <AdminPage title="Споры" side="Споры" back={cur ? '/admin/disputes' : undefined}>
        {cur ? detail : <><h1 className="h1">Споры</h1>{tabs}{queue}</>}
      </AdminPage>
    );
  return (
    <AdminPage title="Споры" side="Споры">
      <div className="between"><h1 className="h1">Споры</h1>{tabs}</div>
      <div className="cols c2l">{queue}<div style={{ display: 'grid', gap: 16, minWidth: 0 }}>{detail ?? <Empty icon="shield" title="Выберите спор" style={{ maxWidth: 'none' }} />}</div></div>
    </AdminPage>
  );
}
