import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Empty, Kv, Note, Sheet, St, TextField, Timeline, Tz } from '../../ui/kit';
import { Person, lessonStatus } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, rules, userById } from '../../api';
import type { Lesson } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { dative, genitive } from '../../lib/names';
import { fmtDateShort, fmtDay, fmtDayTime, fmtDuration, fmtTime, utcLabel, weekdayShort, zoneCity, zoned } from '../../lib/time';
import { BackBtn } from './shared';

export default function TutorSeries() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const [decline, setDecline] = useState(false);
  const [msg, setMsg] = useState('');
  const s = d.series.find(x => x.id === id && x.tutorId === me.id);
  if (!s) return <Page title="Серия" back="/tutor/lessons" kind="cabinet" side="Уроки"><Empty icon="repeat" title="Серия не найдена" action={<Btn to="/tutor/lessons">Уроки</Btn>} /></Page>;
  const tz = me.tz;
  const st = userById(d, s.studentId);
  const name = s.participant.name;
  const lessons = s.lessonIds.map(x => d.lessons.find(l => l.id === x)).filter(Boolean) as Lesson[];
  const firstL = lessons[0];
  const lastL = lessons[lessons.length - 1];
  const combos = [...new Map(lessons.map(l => { const p = zoned(l.start, tz); return [`${p.weekday}-${p.hour}-${p.minute}`, p] as const; })).values()].sort((a, b) => a.weekday - b.weekday);
  const sameTime = new Set(combos.map(p => `${p.hour}:${p.minute}`)).size === 1;
  const fmtHM = (p: { hour: number; minute: number }) => `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
  const schedule = sameTime && combos[0] ? `${[...new Set(combos.map(p => weekdayShort(p.weekday)))].join(' и ')}, ${fmtHM(combos[0])}` : combos.map(p => `${weekdayShort(p.weekday)} ${fmtHM(p)}`).join(', ');
  const pending = s.status === 'pending';
  const confirm = () => { const ok = run(() => { booking.confirmSeries(s.id); return true; }); if (ok) { toast(`Серия подтверждена, ${name} получил(а) уведомление`, { tone: 'ok' }); navigate('/tutor/lessons'); } };
  const statusSt = pending ? <St tone="action" icon="clock">{`Осталось ${fmtDuration(s.confirmDeadline - at)}`}</St> : s.status === 'confirmed' ? <St tone="ok" icon="check">Подтверждена</St> : <St tone="neutral" icon="x">{s.status === 'cancelled' ? 'Отменена' : s.status === 'declined' ? 'Отклонена' : 'Не подтверждена вовремя'}</St>;
  const cardEl = (
    <section className="card">
      <div className="between"><span className="small" style={{ fontWeight: 700 }}>{pending ? 'Новая серия' : 'Серия'}</span>{statusSt}</div>
      <Person name={st ? (s.participant.age ? `${name}, ${s.participant.age}` : name) : name} sub={`${s.subject} · ${s.minutes} мин`} tone={st?.tone ?? 'teal'} src={st?.photo} />
      <Kv rows={[
        ['Расписание', schedule],
        ['Занятий', firstL && lastL ? `${s.count}, ${fmtDateShort(firstL.start, tz)} – ${fmtDateShort(lastL.start, tz)}` : String(s.count)],
        ...(s.skippedDates.length ? [['Перенесено в конец', `${s.skippedDates.length}, из-за закрытых дней`] as [string, string]] : []),
        ['За каждое вы получите', fmtMoney(s.tutorPrice)],
      ]} />
      {pending ? (
        <>
          <div className="r4-dates">{lessons.map(l => <St key={l.id}>{fmtDay(l.start, tz)}</St>)}</div>
          <div className="cols half" style={{ gap: 8 }}><Btn v="primary" block onClick={confirm}>{`Подтвердить все ${s.count}`}</Btn><Btn block onClick={() => setDecline(true)}>Отклонить</Btn></div>
        </>
      ) : (
        <div>{lessons.map(l => (
          <div className="r4-row" key={l.id}>
            <div className="r4-d"><b>{fmtDayTime(l.start, tz)}</b><span className="small">{l.status === 'unpaid' ? 'списание не прошло' : l.paymentId ? 'оплачено' : rules.isUpcoming(l, at) ? `спишем ${fmtDateShort(l.start - 86_400_000, tz)}` : ''}</span></div>
            <span className="row-s">{lessonStatus(l, 'tutor', at).slice(0, 1)}</span>
            <Btn size="s" to={`/tutor/lessons/${l.id}`}>Открыть</Btn>
          </div>
        ))}</div>
      )}
    </section>
  );
  const notes = <><Tz>{`Время ваше, ${zoneCity(tz)} (${utcLabel(tz)})${st && st.tz !== tz && firstL ? `. У ${genitive(name)} первое занятие в ${fmtTime(firstL.start, st.tz)}` : ''}`}</Tz><Note>Ученик платит за каждое занятие отдельно, за 24 часа до начала. Перевод вам после каждого урока.</Note></>;
  const how = (
    <section className="card"><h3 className="h3">Как это работает</h3>
      <Timeline flat items={[
        { state: 'done', title: `${name} отправил(а) серию`, text: fmtDayTime(s.createdAt, tz) },
        { state: pending ? 'cur' : 'done', title: pending ? 'Вы подтверждаете' : 'Вы подтвердили', text: pending ? `Одним нажатием, за все ${s.count} занятий. До ${fmtDayTime(s.confirmDeadline, tz)}` : undefined },
        { state: 'todo', title: 'Списание у ученика', text: 'За 24 часа до каждого занятия' },
        { state: 'todo', title: 'Перевод вам', text: 'После каждого проведённого урока' },
      ]} />
    </section>
  );
  const sheet = (
    <Sheet open={decline} onClose={() => setDecline(false)} title="Отклонить серию?">
      <span className="sub" style={{ marginTop: -6 }}>{nb(`${name} получит уведомление, заморозка за первое занятие снимется сразу.`)}</span>
      <TextField label={`Сообщение ${dative(name)}`} optional="необязательно" multiline rows={3} value={msg} onChange={setMsg} placeholder="Например: по вторникам не могу, давайте среду и четверг" maxLength={500} style={{ maxWidth: 'none' }} />
      <div className="r7-col">
        <Btn v="danger" onClick={() => { const ok = run(() => { booking.declineSeries(s.id, msg.trim() || 'Не могу в это время'); return true; }); if (ok) { setDecline(false); toast('Серия отклонена', { tone: 'ok' }); navigate('/tutor/lessons'); } }}>Отклонить серию</Btn>
        <Btn onClick={() => setDecline(false)}>Назад</Btn>
      </div>
    </Sheet>
  );
  if (phone)
    return (
      <Page title={pending ? 'Новая серия' : 'Серия'} back="/tutor/lessons" className="r4">
        {cardEl}{notes}{sheet}
      </Page>
    );
  return (
    <Page title="Серия" kind="cabinet" side="Уроки" className="r4">
      <BackBtn to="/tutor/lessons" label="Уроки" />
      <div className="title-block"><h1 className="h1">{pending ? `Новая серия от ${genitive(name)}` : `Серия: ${name}`}</h1><p className="sub">{pending ? 'Подтвердите все занятия сразу.' : `${s.count} занятий · ${schedule}`}</p></div>
      <div className="cols c2"><div className="stack" style={{ gap: 14 }}>{cardEl}</div><div className="stack" style={{ gap: 14 }}>{how}{notes}</div></div>
      {sheet}
    </Page>
  );
}
