import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Btn, Empty, Note } from '../../ui/kit';
import { DateStrip, SlotGrid, TzLine, daysFrom, useSlotPicker } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, booking, rules, schedule, lessonById, tutorById, userById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { genitive, instrumental } from '../../lib/names';
import { fmtDayTime } from '../../lib/time';
import { BackBtn, WasNew, paidOf } from './shared';

export default function Move() {
  const { id } = useParams();
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const l = lessonById(d, id);
  const t = l && tutorById(d, l.tutorId);
  const tutorSide = me.role === 'tutor';
  const slots = useMemo(() => (l && t ? schedule.freeSlots(d, t, { minutes: l.minutes, excludeLessonId: l.id, ignoreHorizon: true, untilDays: 21, forStudentId: l.studentId }) : []), [d, l, t]);
  const picker = useSlotPicker(slots, me.tz);
  const backTo = tutorSide ? `/tutor/lessons/${id}` : `/my/lessons/${id}`;
  if (!l || !t || (tutorSide ? l.tutorId !== me.id : l.studentId !== me.id))
    return <Page title="Перенос" back={tutorSide ? '/tutor/lessons' : '/my/lessons'}><Empty icon="cal" title="Урок не найден" /></Page>;

  const tz = me.tz;
  const otherFirst = tutorSide ? l.participant.name : t.name.split(' ')[0];
  const otherTz = tutorSide ? userById(d, l.studentId)?.tz ?? tz : t.tz;
  const until = rules.freeCancelUntil(l);
  const blocked = l.status !== 'confirmed' ? 'Перенести можно только подтверждённый урок.' : !rules.canCancelFree(l, at) ? `Перенос был доступен до ${fmtDayTime(until, tz)}, за 4 ч до начала. Теперь урок можно только отменить.` : l.reschedule?.status === 'pending' ? 'Запрос на перенос уже отправлен, ждём ответа.' : '';
  const amount = l.kind === 'intro' ? 0 : tutorSide ? l.tutorPrice : paidOf(l);
  const lessonLabel = `Урок с ${instrumental(otherFirst)}`;
  const send = () => {
    if (!picker.slot) return;
    const ok = run(() => { booking.requestReschedule(l.id, picker.slot!); return true; }, `Запрос отправлен. ${otherFirst} получит уведомление`);
    if (ok) navigate(backTo);
  };
  const label = picker.slot ? `Предложить ${fmtDayTime(picker.slot, tz)}` : 'Выберите новое время';

  if (blocked)
    return (
      <Page title="Перенести урок" back={backTo} kind="cabinet" side={tutorSide ? 'Уроки' : 'Мои уроки'}>
        {!phone && <BackBtn to={backTo} label={lessonLabel} />}
        <Empty icon="clock" title="Перенести нельзя" action={<Btn to={backTo}>Вернуться к уроку</Btn>}>{blocked}</Empty>
      </Page>
    );

  const rulesNote = <Note tone="action" icon="clock">{`Перенести можно до ${fmtDayTime(until, tz)}, за 4 ч до начала.`}</Note>;
  const pick = (
    <div className="card r7-pick" style={{ overflow: 'hidden' }}>
      <div className="between"><b className="h3">{tutorSide ? 'Ваши свободные окна' : `Свободные окна ${genitive(otherFirst)}`}</b></div>
      {slots.length ? (
        <>
          <DateStrip days={daysFrom(tz, 22)} selected={picker.day} onSelect={picker.setDay} tz={tz} available={picker.available} />
          <SlotGrid slots={picker.byDay.get(picker.day) ?? []} selected={picker.slot} onSelect={picker.setSlot} tz={tz} />
          <TzLine viewerTz={tz} otherTz={otherTz} otherName={genitive(otherFirst)} sample={picker.slot} />
        </>
      ) : <p className="small">{tutorSide ? 'Свободных окон на 3 недели нет. Откройте окна в расписании.' : 'Свободных окон на 3 недели нет. Напишите репетитору в чат.'}</p>}
    </div>
  );
  const moveRules = (
    <>
      {amount > 0 && <Note icon="card">{`Оплата ${fmtMoney(amount)} перейдёт на новое время.`}</Note>}
      <Note>{`Если ${otherFirst} откажется, урок останется в ${fmtDayTime(l.start, tz)}.`}</Note>
    </>
  );
  const fromTo = <WasNew was={fmtDayTime(l.start, tz)} now={picker.slot ? fmtDayTime(picker.slot, tz) : '—'} />;

  if (phone)
    return (
      <Page title="Перенести урок" back={backTo} bottom={<ActionBar><Btn v="primary" size="m" disabled={!picker.slot} onClick={send}>{label}</Btn></ActionBar>}>
        {rulesNote}
        {pick}
        <div className="card">{fromTo}{moveRules}</div>
      </Page>
    );
  return (
    <Page title="Перенести урок" kind="cabinet" side={tutorSide ? 'Уроки' : 'Мои уроки'}>
      <BackBtn to={backTo} label={lessonLabel} />
      <h1 className="h1">Перенести урок</h1>
      <div className="cols c2">
        <div className="r7-col" style={{ gap: 16 }}>{rulesNote}{pick}</div>
        <div className="card"><b className="h3">Ваш перенос</b>{fromTo}{moveRules}<Btn v="primary" size="m" block disabled={!picker.slot} onClick={send}>{label}</Btn></div>
      </div>
    </Page>
  );
}
