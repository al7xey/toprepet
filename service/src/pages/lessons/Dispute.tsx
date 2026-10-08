import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Ava, Btn, Empty, St, Timeline } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, chat, lessonById, tutorById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { dative } from '../../lib/names';
import { fmtDate, fmtDay, fmtDayTime } from '../../lib/time';
import { BackBtn, ShotList, disputeSteps, paidOf } from './shared';

export default function Dispute() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const dp = d.disputes.find(x => x.id === id);
  const l = dp && lessonById(d, dp.lessonId);
  const t = l && tutorById(d, l.tutorId);
  if (!dp || !l || !t || dp.studentId !== me.id) return <Page title="Спор" back="/my/lessons"><Empty icon="help" title="Спор не найден" action={<Btn to="/my/lessons">Мои уроки</Btn>} /></Page>;
  const tz = me.tz;
  const first = t.name.split(' ')[0];
  const paid = paidOf(l);
  const dativeName = dative(first);
  const open = dp.status === 'open';
  const title = `Спор по уроку ${fmtDate(l.start, tz)}`;
  const line = open ? `Решение до ${fmtDay(dp.decideBy, tz)} · ${fmtMoney(paid)} заморожены` : 'Спор решён';
  const support = () => {
    const c = run(() => chat.openSupport(l.id));
    if (c) navigate('/support');
  };
  const status = open ? <St tone="action" icon="clock">На рассмотрении</St> : <St tone="ok" icon="check">Решён</St>;
  const parties = (
    <div className="card" style={{ gap: 16 }}>
      <span className="h3">Позиции сторон</span>
      <div className="r8-party"><Ava tone={me.tone} src={me.photo} /><div><b>{`${l.participant.name} (вы)`}</b><span className="q">{nb(`${dp.reason}${dp.details ? `: ${dp.details}` : ''}`)}</span><ShotList shots={dp.shots} /></div></div>
      <div className="r8-party"><Ava tone={t.tone} src={t.photo} /><div><b>{first}</b>{dp.tutorAnswer ? <><span className="q">{nb(dp.tutorAnswer.text)}</span><ShotList shots={dp.tutorAnswer.shots} /></> : <span className="q wait">{nb(at > dp.tutorDeadline ? 'Не ответил(а) за 24 часа.' : `Ещё не ответил(а). Есть время до ${fmtDayTime(dp.tutorDeadline, tz)}.`)}</span>}</div></div>
    </div>
  );
  const res = dp.resolution;
  const outcome = open ? (
    <div className="card" style={{ gap: 6 }}>
      <span className="h3">Чем может закончиться</span>
      <div className="r8-out">
        <div><span>Полный возврат</span>{nb(`${fmtMoney(paid)} вам`)}</div>
        <div><span>Частичный, например</span>{nb(`${fmtMoney(Math.round(paid / 2))} вам`)}</div>
        <div><span>Урок засчитан</span>{`оплата ${dativeName}`}</div>
      </div>
    </div>
  ) : res && (
    <Alert tone="ok" icon="shield" style={{ maxWidth: 'none' }} title={res.kind === 'refund_full' ? `Полный возврат ${fmtMoney(res.refund)}` : res.kind === 'pay_tutor' ? 'Урок засчитан' : `Возврат ${fmtMoney(res.refund)}`}>
      {nb(`${res.kind === 'pay_tutor' ? `Оплата ушла ${dativeName}.` : 'Деньги придут на карту, с которой платили, за 1–5 рабочих дней.'}${res.comment ? ` ${res.comment}` : ''}`)}
    </Alert>
  );
  const tl = <Timeline items={disputeSteps(dp, l, tz, 'student', l.participant.name, first, at)} label="Ход спора" />;
  if (phone)
    return (
      <Page title="Спор" back={`/my/lessons/${l.id}`}>
        <div className="card">
          <div style={{ display: 'grid', gap: 2 }}><span className="h3">{title}</span><span className="small">{nb(`${t.name} · ${l.subject}, ${l.minutes} мин`)}</span></div>
          <div className="row-s">{status}</div>
          <span className="sub" style={{ fontSize: 14 }}>{nb(line)}</span>
        </div>
        {tl}{parties}{outcome}
        <Btn size="m" block onClick={support}>Написать в поддержку</Btn>
      </Page>
    );
  return (
    <Page title="Спор" kind="cabinet" side="Мои уроки">
      <BackBtn to={`/my/lessons/${l.id}`} label="Урок" />
      <div className="between"><div className="title-block"><h1 className="h1">{title}</h1><p className="sub">{nb(`${t.name} · ${line.charAt(0).toLowerCase()}${line.slice(1)}`)}</p></div>{status}</div>
      <div className="cols c2">
        <div className="stack">{parties}{outcome}</div>
        <div className="stack">{tl}<div className="card"><span className="small">Есть вопрос или новые подробности?</span><Btn size="m" block onClick={support}>Написать в поддержку</Btn></div></div>
      </div>
    </Page>
  );
}
