import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Lesson } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { minutes, rub, until, whenLabel } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { Button, Card, FormError, LessonStatus, Modal, Note, OptionChips, PageHeader, QueryView, Rows, SlotPicker, StudentCard, lessonTitle, useToast } from '../../ui';
import { DeclineModal } from './lessons';

const CANCEL_REASONS = ['Не получается в это время', 'Заболел(а)', 'Другая причина'];

/** Карточка урока репетитора: ответить на запись, перенести, отменить, отметить результат. */
export default function TutorLessonPage() {
  const { id = '' } = useParams();
  const lesson = useQuery(`lesson-${id}`, () => api.getLesson(id));
  return (
    <AppLayout role="tutor" narrow>
      <QueryView query={lesson} empty={() => null}>
        {(l) => <View lesson={l} onChange={lesson.setData} />}
      </QueryView>
    </AppLayout>
  );
}

function View({ lesson, onChange }: { lesson: Lesson; onChange: (l: Lesson) => void }) {
  const toast = useToast();
  const now = useNow();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const startMs = new Date(lesson.start).getTime();
  const endMs = startMs + lesson.durationMin * 60_000;
  const joinOpen = lesson.status === 'confirmed' && now >= startMs - 10 * 60_000 && now < endMs;
  const ended = lesson.status === 'confirmed' && now >= endMs;
  const confirm = useMutation(() => api.confirmLesson(lesson.id));
  const mark = useMutation((value: 'happened' | 'no_show_student') => api.markLessonResult(lesson.id, value));
  const answer = useMutation((accept: boolean) => api.answerMove(lesson.id, accept));
  const proposal = lesson.moveProposal && lesson.moveProposal.by !== 'tutor' ? lesson.moveProposal : null;

  const run = async <T extends Lesson>(p: Promise<T | undefined>, message: string) => { const done = await p; if (done) { onChange(done); toast(message); } };

  return (
    <>
      <PageHeader title={lessonTitle(lesson)} back={{ to: '/tutor/lessons', label: 'Уроки' }} lead={<>{whenLabel(lesson.start)}<span className="trk-lesson-state"><LessonStatus lesson={lesson} role="tutor" /></span></>} />
      <Card>
        <StudentCard name={lesson.studentName} photo={lesson.studentPhoto} sub={lesson.subject} />
        <Rows rows={[
          ['Когда', whenLabel(lesson.start)],
          ['Длительность', minutes(lesson.durationMin)],
          ['Вы получите', lesson.tutorPrice ? rub(lesson.tutorPrice) : 'Бесплатное знакомство'],
        ]} />
      </Card>
      {lesson.status === 'pending' && <Note tone="info" icon="clock">Ответьте {lesson.confirmBy ? <b>{until(lesson.confirmBy)}</b> : 'как можно скорее'}: если не ответить вовремя, запись отменится, а деньги ученика вернутся.</Note>}
      {lesson.status === 'declined' && <Note tone="plain" icon="x">Вы отклонили запись{lesson.declineReason ? `: ${lesson.declineReason}` : ''}.</Note>}
      {lesson.status === 'cancelled' && <Note tone="plain" icon="x">Урок отменён{lesson.cancelReason ? `: ${lesson.cancelReason}` : ''}.</Note>}
      {proposal && (
        <Note tone="info" icon="repeat" action={<span className="trk-actions"><Button size="s" onClick={() => run(answer.run(true), 'Перенос подтверждён')} loading={answer.pending}>Принять</Button><Button size="s" variant="fill" onClick={() => run(answer.run(false), 'Перенос отклонён')}>Отклонить</Button></span>}>
          Ученик предлагает перенести урок на <b>{whenLabel(proposal.start)}</b>.
        </Note>
      )}
      {lesson.disputeId && <Note tone="bad" icon="flag" action={<Button size="s" to={`/tutor/disputes/${lesson.disputeId}`}>Открыть спор</Button>}>Ученик сообщил о проблеме с этим уроком. Ответьте поддержке.</Note>}
      <FormError error={confirm.error ?? mark.error ?? answer.error} />
      <div className="trk-actions">
        {lesson.status === 'pending' && <><Button size="lg" onClick={() => run(confirm.run(), 'Запись подтверждена')} loading={confirm.pending}>Подтвердить</Button><Button size="lg" variant="fill" onClick={() => setDeclineOpen(true)}>Отклонить</Button></>}
        {joinOpen && lesson.meetingUrl && <Button size="lg" icon="video" href={lesson.meetingUrl}>Войти в урок</Button>}
        {ended && <><Button size="lg" onClick={() => run(mark.run('happened'), 'Урок отмечен как состоявшийся')} loading={mark.pending}>Урок состоялся</Button><Button size="lg" variant="fill" onClick={() => run(mark.run('no_show_student'), 'Отметили: ученик не пришёл')}>Ученик не пришёл</Button></>}
        {lesson.status === 'confirmed' && !ended && <><Button size="lg" variant="line" icon="repeat" onClick={() => setMoveOpen(true)}>Предложить перенос</Button><Button size="lg" variant="fill" onClick={() => setCancelOpen(true)}>Отменить урок</Button></>}
      </div>
      <DeclineModal lesson={lesson} open={declineOpen} onClose={() => setDeclineOpen(false)} onDone={(l) => { onChange(l); setDeclineOpen(false); toast('Запись отклонена'); }} />
      <CancelModal lesson={lesson} open={cancelOpen} onClose={() => setCancelOpen(false)} onDone={(l) => { onChange(l); setCancelOpen(false); toast('Урок отменён, ученику вернутся деньги'); }} />
      <MoveModal lesson={lesson} open={moveOpen} onClose={() => setMoveOpen(false)} onDone={(l) => { onChange(l); setMoveOpen(false); toast('Предложение отправлено ученику'); }} />
    </>
  );
}

function CancelModal({ lesson, open, onClose, onDone }: { lesson: Lesson; open: boolean; onClose: () => void; onDone: (l: Lesson) => void }) {
  const [reason, setReason] = useState<string | null>(null);
  const cancel = useMutation((text: string) => api.cancelLesson(lesson.id, text));
  const submit = async () => { const updated = await cancel.run(reason ?? ''); if (updated) onDone(updated); };
  return (
    <Modal open={open} onClose={onClose} title="Отменить урок?" footer={<><Button variant="fill" onClick={onClose}>Не отменять</Button><Button variant="danger" onClick={submit} disabled={!reason} loading={cancel.pending}>Отменить урок</Button></>}>
      <Note tone="bad" icon="alert">Ученику вернутся деньги. Частые отмены снижают позиции анкеты в каталоге.</Note>
      <OptionChips options={CANCEL_REASONS} value={reason} onChange={setReason} label="Причина" />
      <FormError error={cancel.error} />
    </Modal>
  );
}

function MoveModal({ lesson, open, onClose, onDone }: { lesson: Lesson; open: boolean; onClose: () => void; onDone: (l: Lesson) => void }) {
  const [start, setStart] = useState<string | null>(null);
  const from = useState(() => new Date().toISOString())[0];
  const slots = useQuery(open ? `slots-${lesson.tutorId}-move` : null, () => api.getTutorSlots(lesson.tutorId, from, 14));
  const move = useMutation((value: string) => api.proposeMove(lesson.id, value));
  const submit = async () => { if (!start) return; const updated = await move.run(start); if (updated) onDone(updated); };
  return (
    <Modal open={open} onClose={onClose} width={640} title="Предложить перенос" footer={<><Button variant="fill" onClick={onClose}>Закрыть</Button><Button onClick={submit} disabled={!start} loading={move.pending}>Предложить это время</Button></>}>
      <p className="cap">Выберите свободное время из своего расписания. Урок перенесётся, когда ученик согласится.</p>
      <SlotPicker slots={slots.data ?? []} value={start} onChange={setStart} days={14} loading={slots.loading && !slots.data} />
      <FormError error={move.error} />
    </Modal>
  );
}
