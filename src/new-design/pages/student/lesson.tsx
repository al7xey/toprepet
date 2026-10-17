import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Lesson } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { useNow } from '../../lib/useNow';
import { minutes, rub, until, whenLabel } from '../../lib/format';
import { Button, Card, FormError, LessonStatus, Modal, Note, OptionChips, PageHeader, Person, QueryView, Rows, Section, SlotPicker, TextArea, lessonTitle, useToast } from '../../ui';

const HOUR = 3_600_000;
const REASONS = ['Изменились планы', 'Заболел(а)', 'Нашёл(ла) другого репетитора', 'Другое'];
const PAYMENT: Record<Lesson['payment'], string> = { none: 'Бесплатно', hold: 'Заморожено на карте', captured: 'Спишется после урока', paid_out: 'Оплачено', refunded: 'Деньги возвращены' };

/** Карточка урока ученика: статус, детали, ссылка на урок, перенос и отмена. */
export default function LessonPage() {
  const { id = '' } = useParams();
  const lesson = useQuery(`lesson-${id}`, () => api.getLesson(id));
  return (
    <AppLayout role="student" narrow>
      <QueryView query={lesson} empty={() => null}>
        {(l) => <LessonView lesson={l} onChange={lesson.setData} />}
      </QueryView>
    </AppLayout>
  );
}

function LessonView({ lesson, onChange }: { lesson: Lesson; onChange: (l: Lesson) => void }) {
  const toast = useToast();
  const now = useNow();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const startMs = new Date(lesson.start).getTime();
  const active = lesson.status === 'pending' || lesson.status === 'confirmed';
  const late = startMs - now < 4 * HOUR;
  const joinOpen = lesson.status === 'confirmed' && now >= startMs - 10 * 60_000 && now < startMs + lesson.durationMin * 60_000;
  const answer = useMutation((accept: boolean) => api.answerMove(lesson.id, accept));
  const proposal = lesson.moveProposal && lesson.moveProposal.by !== 'student' ? lesson.moveProposal : null;

  const reply = async (accept: boolean) => {
    const updated = await answer.run(accept);
    if (updated) { onChange(updated); toast(accept ? 'Перенос подтверждён' : 'Перенос отклонён'); }
  };

  return (
    <>
      <PageHeader title={lessonTitle(lesson)} back={{ to: '/me/lessons', label: 'Мои уроки' }} lead={whenLabel(lesson.start)} actions={<LessonStatus lesson={lesson} role="student" />} />
      <Card>
        <Person name={lesson.tutorName} photo={lesson.tutorPhoto} sub={lesson.subject} right={<Button to={`/teachers/${lesson.tutorId}/`} variant="line" size="s">Анкета</Button>} />
        <Rows rows={[
          ['Когда', whenLabel(lesson.start)],
          ['Длительность', minutes(lesson.durationMin)],
          ['Стоимость', lesson.price ? rub(lesson.price) : 'Бесплатно'],
          ['Оплата', PAYMENT[lesson.payment]],
        ]} />
      </Card>

      {lesson.status === 'pending' && <Note tone="plain" icon="clock">Репетитор ещё не подтвердил запись{lesson.confirmBy ? <>, ответ ожидается до <b>{whenLabel(lesson.confirmBy)}</b></> : null}. Если он не ответит, запись отменится, а деньги вернутся.</Note>}
      {lesson.status === 'confirmed' && !joinOpen && <Note tone="ok" icon="video">Урок подтверждён. Ссылка на видеосвязь появится здесь за 10 минут до начала ({until(new Date(startMs - 10 * 60_000))}).</Note>}
      {lesson.status === 'declined' && <Note tone="bad">Репетитор отклонил запись{lesson.declineReason ? `: ${lesson.declineReason}` : ''}. Деньги разморожены.</Note>}
      {lesson.status === 'expired' && <Note tone="plain" icon="clock">Репетитор не успел ответить, запись отменена. Деньги разморожены.</Note>}
      {lesson.status === 'cancelled' && <Note tone="plain" icon="x">Урок отменён{lesson.cancelReason ? `: ${lesson.cancelReason}` : ''}.</Note>}
      {proposal && (
        <Note tone="info" icon="repeat" action={<span className="trk-actions"><Button size="s" onClick={() => reply(true)} loading={answer.pending}>Принять</Button><Button size="s" variant="fill" onClick={() => reply(false)}>Отклонить</Button></span>}>
          Репетитор предлагает перенести урок на <b>{whenLabel(proposal.start)}</b>.
        </Note>
      )}
      <FormError error={answer.error} />

      {(joinOpen || active) && (
        <div className="trk-actions">
          {joinOpen && lesson.meetingUrl && <Button size="lg" icon="video" href={lesson.meetingUrl}>Войти в урок</Button>}
          {active && lesson.moveProposal?.by !== 'student' && !proposal && <Button variant="line" size="lg" icon="repeat" onClick={() => setMoveOpen(true)}>Перенести</Button>}
          {active && <Button variant="fill" size="lg" onClick={() => setCancelOpen(true)}>Отменить урок</Button>}
        </div>
      )}
      {lesson.moveProposal?.by === 'student' && <Note tone="plain" icon="clock">Вы предложили перенести урок на {whenLabel(lesson.moveProposal.start)}. Ждём ответ репетитора.</Note>}

      <Section title="Отмена и перенос">
        <Card><p className="cap">Отмена бесплатна за 4 часа и раньше до начала. Позже деньги получает репетитор. Для переноса предложите другое время: репетитор подтвердит его.</p></Card>
      </Section>
      <p className="muted"><Link className="acc" to="/help">Нужна помощь?</Link></p>

      <CancelModal lesson={lesson} late={late} open={cancelOpen} onClose={() => setCancelOpen(false)} onDone={(l) => { onChange(l); setCancelOpen(false); toast('Урок отменён'); }} />
      <MoveModal lesson={lesson} open={moveOpen} onClose={() => setMoveOpen(false)} onDone={(l) => { onChange(l); setMoveOpen(false); toast('Предложение отправлено репетитору'); }} />
    </>
  );
}

function CancelModal({ lesson, late, open, onClose, onDone }: { lesson: Lesson; late: boolean; open: boolean; onClose: () => void; onDone: (l: Lesson) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const cancel = useMutation((text: string) => api.cancelLesson(lesson.id, text));
  const submit = async () => {
    const text = reason === 'Другое' ? other.trim() || 'Другое' : reason ?? '';
    const updated = await cancel.run(text);
    if (updated) onDone(updated);
  };
  const free = !late || lesson.payment === 'hold';
  return (
    <Modal open={open} onClose={onClose} title="Отменить урок?" footer={<><Button variant="fill" onClick={onClose}>Не отменять</Button><Button variant="danger" onClick={submit} disabled={!reason} loading={cancel.pending}>Отменить урок</Button></>}>
      {free
        ? <Note tone="ok" icon="check">{lesson.payment === 'hold' ? 'Репетитор ещё не подтвердил запись, деньги вернутся полностью.' : 'До начала больше 4 часов, отмена бесплатная.'}</Note>
        : <Note tone="bad" icon="alert">До начала меньше 4 часов: деньги за этот урок получит репетитор.</Note>}
      <OptionChips options={REASONS} value={reason} onChange={setReason} label="Причина" />
      {reason === 'Другое' && <TextArea label="Что случилось" value={other} onChange={(e) => setOther(e.target.value)} rows={3} />}
      <FormError error={cancel.error} />
    </Modal>
  );
}

function MoveModal({ lesson, open, onClose, onDone }: { lesson: Lesson; open: boolean; onClose: () => void; onDone: (l: Lesson) => void }) {
  const [start, setStart] = useState<string | null>(null);
  const from = useState(() => new Date().toISOString())[0];
  const slots = useQuery(open ? `slots-${lesson.tutorId}-move` : null, () => api.getTutorSlots(lesson.tutorId, from, 14));
  const move = useMutation((value: string) => api.proposeMove(lesson.id, value));
  const submit = async () => {
    if (!start) return;
    const updated = await move.run(start);
    if (updated) onDone(updated);
  };
  return (
    <Modal open={open} onClose={onClose} width={640} title="Перенести урок" footer={<><Button variant="fill" onClick={onClose}>Закрыть</Button><Button onClick={submit} disabled={!start} loading={move.pending}>Предложить это время</Button></>}>
      <p className="cap">Выберите новое время. Урок перенесётся, когда репетитор его подтвердит.</p>
      <SlotPicker slots={slots.data ?? []} value={start} onChange={setStart} days={14} loading={slots.loading && !slots.data} />
      <FormError error={move.error} />
    </Modal>
  );
}
