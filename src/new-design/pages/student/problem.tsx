import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { whenLabel } from '../../lib/format';
import { Button, Card, FormError, Note, OptionChips, PageHeader, Person, QueryView, Rows, TextArea, lessonTitle } from '../../ui';

const REASONS = ['Репетитор не пришёл', 'Не получилось подключиться', 'Урок прошёл не так, как договаривались', 'Другое'];
const MIN = 20;

/** «Сообщить о проблеме»: причина и описание, затем открывается спор с поддержкой. */
export default function ProblemPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const lesson = useQuery(`lesson-${id}`, () => api.getLesson(id));
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const send = useMutation((lessonId: string) => api.reportProblem({ lessonId, reason: reason ?? '', text: text.trim() }));
  const submit = async () => {
    setTouched(true);
    if (!reason || text.trim().length < MIN) return;
    const dispute = await send.run(id);
    if (dispute) void navigate(`/me/disputes/${dispute.id}`);
  };
  return (
    <AppLayout role="student" narrow>
      <QueryView query={lesson} empty={() => null}>
        {(l) => (
          <>
            <PageHeader title="Сообщить о проблеме" back={{ to: `/me/lessons/${l.id}`, label: lessonTitle(l) }} lead="Расскажите, что случилось. Поддержка разберётся и вернёт деньги, если урок не состоялся." />
            {l.disputeId ? (
              <Note tone="plain" icon="info" action={<Button size="s" to={`/me/disputes/${l.disputeId}`}>Открыть спор</Button>}>По этому уроку уже есть обращение.</Note>
            ) : (
              <Card>
                <Person name={l.tutorName} photo={l.tutorPhoto} sub={l.subject} />
                <Rows rows={[['Когда', whenLabel(l.start)]]} />
                <form className="trk-form" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
                  <OptionChips options={REASONS} value={reason} onChange={setReason} label="Что произошло" />
                  {touched && !reason && <span className="trk-error" role="alert">Выберите причину</span>}
                  <TextArea label="Подробности" rows={5} maxLength={1500} placeholder="Опишите, что случилось и когда" value={text} onChange={(e) => setText(e.target.value)} hint={`${text.trim().length} из ${MIN} символов минимум`} error={touched && text.trim().length < MIN ? `Напишите хотя бы ${MIN} символов` : undefined} />
                  <Note tone="plain" icon="shield">Сообщить о проблеме можно в течение 24 часов после начала урока. Пока идёт разбор, деньги за урок остаются на удержании.</Note>
                  <FormError error={send.error} />
                  <div className="trk-actions">
                    <Button type="submit" size="lg" loading={send.pending}>Отправить обращение</Button>
                    <Button variant="fill" size="lg" to={`/me/lessons/${l.id}`}>Отмена</Button>
                  </div>
                </form>
              </Card>
            )}
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}
