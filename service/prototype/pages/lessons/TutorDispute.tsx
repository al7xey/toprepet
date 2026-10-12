import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Ava, Btn, Empty, Note, St, Textarea, Timeline } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, lessonById, userById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { fmtDate, fmtDay, fmtDayTime, fmtTime } from '../../lib/time';
import { BackBtn, ShotList, ShotsInput, disputeSteps, type Shot } from './shared';

export default function TutorDispute() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const { run } = useApp();
  const [text, setText] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const dp = d.disputes.find(x => x.id === id);
  const l = dp && lessonById(d, dp.lessonId);
  const st = l && userById(d, l.studentId);
  if (!dp || !l || !st || dp.tutorId !== me.id) return <Page title="Спор" back="/tutor/lessons" kind="cabinet" side="Уроки"><Empty icon="help" title="Спор не найден" action={<Btn to="/tutor/lessons">Уроки</Btn>} /></Page>;
  const tz = me.tz;
  const who = l.participant.name;
  const open = dp.status === 'open';
  const canAnswer = open && !dp.tutorAnswer;
  const late = at > dp.tutorDeadline;
  const title = `Спор по уроку ${fmtDate(l.start, tz)}`;
  const send = () => run(() => booking.answerDispute(dp.id, text, shots), 'Объяснение отправлено, поддержка изучит обе позиции');
  const res = dp.resolution;
  const claim = (
    <div className="card" style={{ gap: 12 }}>
      <span className="h3">{`Что пишет ${who}`}</span>
      <div className="r8-party"><Ava tone={st.tone} src={st.photo} /><div><b>{dp.reason}</b>{dp.details && <span className="q">{nb(dp.details)}</span>}<ShotList shots={dp.shots} /></div></div>
    </div>
  );
  const explain = canAnswer ? (
    <div className="card" style={{ gap: 14 }}>
      <span className="h3">Ваше объяснение</span>
      <Textarea aria-label="Ваше объяснение" value={text} onChange={e => setText(e.target.value)} placeholder="Как всё было: время подключения, что успели пройти" style={{ minHeight: phone ? 110 : 120 }} maxLength={1000} />
      <ShotsInput shots={shots} onChange={setShots} hint="Можно приложить переписку" />
      {phone ? <Btn v="primary" size="m" block onClick={send}>Отправить</Btn> : <div><Btn v="primary" size="m" onClick={send}>Отправить</Btn></div>}
    </div>
  ) : dp.tutorAnswer ? (
    <div className="card" style={{ gap: 12 }}>
      <div className="between"><span className="h3">Ваше объяснение</span><span className="small">{fmtDayTime(dp.tutorAnswer.at, tz)}</span></div>
      <div className="r8-party"><Ava tone={me.tone} src={me.photo} /><div><span className="q">{nb(dp.tutorAnswer.text)}</span><ShotList shots={dp.tutorAnswer.shots} /></div></div>
    </div>
  ) : null;
  const moneyText = res ? (res.kind === 'refund_full' ? 'Оплату вернули ученику.' : res.kind === 'pay_tutor' ? `${fmtMoney(l.tutorPrice)} переводим вам.` : `Частичный возврат ученику, вам — ${fmtMoney(Math.round(l.tutorPrice * (1 - res.refund / (l.studentPrice - l.discount))))}.`) : `Поддержка решит до ${fmtDay(dp.decideBy, tz)}: перевод вам или возврат ученику.`;
  const moneyCard = (
    <div className="card">
      <div className="h3">Деньги за урок</div>
      <div className="between"><span className="sub">{open ? 'В споре' : 'Решено'}</span><span className="money" style={{ fontSize: 22 }}>{fmtMoney(l.tutorPrice)}</span></div>
      <Note icon="shield">{moneyText}{res?.comment ? ` ${res.comment}` : ''}</Note>
      <div><Btn size="s" to="/tutor/finance">Финансы</Btn></div>
    </div>
  );
  const alert = canAnswer
    ? <Alert tone="action" icon={phone ? 'help' : 'clock'} style={{ maxWidth: 'none' }} title={phone ? `${who} сообщил(а) о проблеме` : late ? 'Срок ответа прошёл' : `Ответьте до ${fmtTime(dp.tutorDeadline, tz)} ${fmtDay(dp.tutorDeadline, tz)}`}>{late ? 'Объяснение ещё можно отправить, пока поддержка не приняла решение.' : phone ? `Урок ${fmtDayTime(l.start, tz)} по вашему времени. Ответьте до ${fmtDayTime(dp.tutorDeadline, tz)}.` : 'Объяснение и скриншоты помогут поддержке разобраться.'}</Alert>
    : res ? <Alert tone="ok" icon="shield" style={{ maxWidth: 'none' }} title="Спор решён">{moneyText}</Alert> : null;
  const status = canAnswer ? <St tone="action" icon="clock">Ждём ваш ответ</St> : open ? <St tone="neutral" icon="clock">На рассмотрении</St> : <St tone="ok" icon="check">Решён</St>;
  const tl = <section className="card"><h3 className="h3">Ход спора</h3><Timeline items={disputeSteps(dp, l, tz, 'tutor', who, me.name.split(' ')[0], at)} flat /></section>;
  if (phone)
    return (
      <Page title="Спор" back={`/tutor/lessons/${l.id}`}>
        {alert}{claim}{explain}{moneyCard}{tl}
      </Page>
    );
  return (
    <Page title="Спор" kind="cabinet" side="Уроки">
      <BackBtn to={`/tutor/lessons/${l.id}`} label="Урок" />
      <div className="between"><div className="title-block"><h1 className="h1">{title}</h1><p className="sub">{nb(`${who} · ${l.subject}, ${l.minutes} мин · ${fmtDayTime(l.start, tz)} по вашему времени`)}</p></div>{status}</div>
      {alert}
      <div className="cols c2">
        <div className="stack">{claim}{explain}</div>
        <div className="stack">{moneyCard}{tl}</div>
      </div>
    </Page>
  );
}
