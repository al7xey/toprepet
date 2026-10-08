import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Btn, Empty, Note, Options, TextField } from '../../ui/kit';
import { Person } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, rules, lessonById, tutorById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { fmtDayTime } from '../../lib/time';
import { BackBtn, ShotsInput, paidOf, type Shot } from './shared';

const REASONS = ['Репетитор не пришёл', 'Урок сократили', 'Не соответствует описанию', 'Другое'];

export default function Problem() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const contest = sp.get('source') === 'no_show';
  const [reason, setReason] = useState(contest ? 'Я был(а) на уроке' : '');
  const [details, setDetails] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [tried, setTried] = useState(false);
  const l = lessonById(d, id);
  const t = l && tutorById(d, l.tutorId);
  if (!l || !t || l.studentId !== me.id) return <Page title="Проблема с уроком" back="/my/lessons"><Empty icon="cal" title="Урок не найден" /></Page>;
  const back = `/my/lessons/${l.id}`;
  const tz = me.tz;
  const money = fmtMoney(paidOf(l));
  const until = contest ? (l.noShowAt ?? at) + 24 * 3600_000 : rules.answerUntil(l);
  const closed = l.disputeId ? 'Спор по этому уроку уже открыт.' : l.kind === 'intro' ? 'Знакомство бесплатное, спор по нему не открывается. Напишите в поддержку, если что-то пошло не так.' : at > until ? 'Прошло больше 24 часов, урок засчитан. Если что-то пошло не так, напишите в поддержку.' : '';
  if (closed)
    return (
      <Page title="Проблема с уроком" back={back} kind="cabinet" side="Мои уроки">
        {!phone && <BackBtn to={back} label="Урок" />}
        <Empty icon="help" title="Сообщить о проблеме нельзя" action={<div className="row-s" style={{ justifyContent: 'center' }}>{l.disputeId && <Btn v="primary" to={`/disputes/${l.disputeId}`}>Открыть спор</Btn>}<Btn to="/support">Написать в поддержку</Btn></div>}>{closed}</Empty>
      </Page>
    );

  const err = tried && !reason ? 'Выберите, что случилось' : tried && reason === 'Другое' && details.trim().length < 10 ? 'Опишите, что произошло' : '';
  const send = () => {
    setTried(true);
    if (!reason || (reason === 'Другое' && details.trim().length < 10)) return;
    const dp = run(() => booking.reportProblem(l.id, reason, details, shots, contest ? 'no_show_contest' : 'problem'));
    if (dp) navigate(`/disputes/${dp}`, { replace: true });
  };
  const mini = <Person name={t.name} sub={`${fmtDayTime(l.start, tz)} · ${l.subject}`} tone={t.tone} src={t.photo} />;
  const fields = (
    <>
      {contest
        ? <Note tone="action" icon="warn">{`${t.name.split(' ')[0]} отметил(а), что вы не пришли. Расскажите, как было на самом деле.`}</Note>
        : <Options legend={<span className="h3">Что случилось?</span>} className="r8-col" options={REASONS} value={reason} onChange={setReason} error={tried && !reason ? err : undefined} />}
      <TextField label="Опишите подробнее" multiline rows={4} value={details} onChange={setDetails} placeholder={contest ? 'Например: подключилась в 19:02, ждала 20 минут' : 'Например: урок закончился через 25 минут, хотя оплачен час'} error={reason && err ? err : undefined} style={{ maxWidth: 'none' }} maxLength={1000} />
      <ShotsInput shots={shots} onChange={setShots} hint={phone ? undefined : 'Можно приложить переписку или скриншот звонка'} />
    </>
  );
  const freeze = <Note tone="action" icon="shield">{`${money} заморозим, пока поддержка не решит. Обычно до 3 рабочих дней.`}</Note>;
  if (phone)
    return (
      <Page title="Проблема с уроком" back={back} bottom={<ActionBar><Btn v="primary" size="m" onClick={send}>Отправить</Btn></ActionBar>}>
        <div className="card" style={{ padding: '14px 16px' }}>{mini}</div>
        {fields}
        {freeze}
      </Page>
    );
  return (
    <Page title="Проблема с уроком" kind="cabinet" side="Мои уроки">
      <BackBtn to={back} label="Урок" />
      <div className="title-block"><h1 className="h1">{contest ? 'Оспорить неявку' : 'Что случилось на уроке?'}</h1><p className="sub">Расскажите, мы разберёмся вместе с репетитором</p></div>
      <div className="cols c2">
        <div className="card" style={{ gap: 18, padding: 24 }}>{fields}<div className="row-s"><Btn v="primary" size="m" onClick={send}>Отправить</Btn><Btn size="m" to={back}>Отмена</Btn></div></div>
        <div className="summary" style={{ maxWidth: 'none' }}>
          <h4>Урок</h4>
          {mini}
          <dl><div><dt>Когда</dt><dd>{fmtDayTime(l.start, tz)}</dd></div><div><dt>Оплачено</dt><dd>{money}</dd></div><div><dt>Сообщить до</dt><dd>{fmtDayTime(until, tz)}</dd></div></dl>
          <Note tone="action" icon="shield">Деньги заморозим до решения. Поддержка решает до 3 рабочих дней.</Note>
        </div>
      </div>
    </Page>
  );
}
