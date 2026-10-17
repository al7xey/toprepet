import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Dispute, DisputeStatus, Lesson, Role } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago, whenLabel } from '../../lib/format';
import { Button, Card, CardTitle, FormError, Note, PageHeader, QueryView, Rows, Section, Status, Steps, TextArea, lessonTitle, useToast, type StepItem, type Tone } from '../../ui';

const STATUS: Record<DisputeStatus, { tone: Tone; text: string }> = {
  open: { tone: 'wait', text: 'Ждём ответ репетитора' },
  tutor_replied: { tone: 'wait', text: 'Поддержка разбирает' },
  resolved_refund: { tone: 'ok', text: 'Деньги возвращены ученику' },
  resolved_paid: { tone: 'ok', text: 'Оплата ушла репетитору' },
};

function stepsFor(d: Dispute, role: Role): StepItem[] {
  const resolved = d.status === 'resolved_refund' || d.status === 'resolved_paid';
  return [
    { title: role === 'student' ? 'Вы сообщили о проблеме' : 'Ученик сообщил о проблеме', text: `Обращение создано ${ago(d.createdAt)}.`, state: 'done' },
    { title: 'Репетитор отвечает', text: d.tutorReply ? 'Ответ получен.' : 'Репетитору отправили уведомление.', state: d.tutorReply ? 'done' : 'current' },
    { title: 'Поддержка принимает решение', text: resolved ? (d.resolution ?? 'Решение принято.') : 'Мы прочитаем обе стороны и вернём деньги ученику или передадим оплату репетитору.', state: resolved ? 'done' : d.tutorReply ? 'current' : 'todo' },
  ];
}

/** Спор по уроку: ученик следит за статусом, репетитор отвечает. */
export default function DisputePage({ role }: { role: 'student' | 'tutor' }) {
  const { id = '' } = useParams();
  const dispute = useQuery(`dispute-${id}`, () => api.getDispute(id));
  const lessonId = dispute.data?.lessonId ?? null;
  const lesson = useQuery(lessonId ? `lesson-${lessonId}` : null, () => api.getLesson(lessonId as string));
  const base = role === 'student' ? '/me' : '/tutor';
  return (
    <AppLayout role={role} narrow>
      <QueryView query={dispute} empty={() => null}>
        {(d) => (
          <>
            <PageHeader title="Спор по уроку" back={{ to: lessonId ? `${base}/lessons/${lessonId}` : `${base}/lessons`, label: lesson.data ? lessonTitle(lesson.data) : 'Уроки' }} actions={<Status tone={STATUS[d.status].tone}>{STATUS[d.status].text}</Status>} />
            <DisputeBody dispute={d} lesson={lesson.data} role={role} onChange={dispute.setData} />
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}

function DisputeBody({ dispute, lesson, role, onChange }: { dispute: Dispute; lesson: Lesson | undefined; role: Role; onChange: (d: Dispute) => void }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const reply = useMutation(() => api.replyDispute(dispute.id, text.trim()));
  const canReply = role === 'tutor' && dispute.status === 'open';
  const submit = async () => {
    setTouched(true);
    if (text.trim().length < 10) return;
    const updated = await reply.run();
    if (updated) { onChange(updated); toast('Ответ отправлен в поддержку'); }
  };
  return (
    <>
      <Card>
        <CardTitle>{dispute.reason}</CardTitle>
        <p className="cap">{dispute.text}</p>
        {lesson && <Rows rows={[['Урок', whenLabel(lesson.start)], [role === 'student' ? 'Репетитор' : 'Ученик', role === 'student' ? lesson.tutorName : lesson.studentName]]} />}
      </Card>
      {dispute.tutorReply && <Card><CardTitle>Ответ репетитора</CardTitle><p className="cap">{dispute.tutorReply}</p></Card>}
      {dispute.resolution && <Note tone="ok" icon="check">{dispute.resolution}</Note>}
      <Section title="Что дальше"><Steps items={stepsFor(dispute, role)} /></Section>
      {canReply && (
        <Card>
          <form className="trk-form" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <TextArea label="Ваш ответ" rows={5} maxLength={1500} placeholder="Расскажите, как всё было. Ответ увидит поддержка" value={text} onChange={(e) => setText(e.target.value)} error={touched && text.trim().length < 10 ? 'Напишите хотя бы пару предложений' : undefined} />
            <FormError error={reply.error} />
            <div className="trk-actions"><Button type="submit" size="lg" loading={reply.pending}>Отправить ответ</Button></div>
          </form>
        </Card>
      )}
      {role === 'tutor' && dispute.status === 'tutor_replied' && <Note tone="plain" icon="clock">Ответ отправлен. Решение поддержки появится здесь.</Note>}
    </>
  );
}
