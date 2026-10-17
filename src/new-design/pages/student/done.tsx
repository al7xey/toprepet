import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { minutes, rub, whenLabel } from '../../lib/format';
import { Button, Card, PageHeader, QueryView, Rows, Section, Status, Steps } from '../../ui';

/** «Запись отправлена»: что будет дальше. */
export default function BookDonePage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const lessonId = params.get('lesson') ?? '';
  const lesson = useQuery(lessonId ? `lesson-${lessonId}` : null, () => api.getLesson(lessonId));
  return (
    <AppLayout role="student" narrow>
      <QueryView query={lesson} empty={() => null}>
        {(l) => (
          <>
            <PageHeader title="Запись отправлена" lead={<>Мы передали запись репетитору <b>{l.tutorName}</b>.</>} actions={<Status tone="wait" icon="clock">Ждёт подтверждения</Status>} />
            <Card>
              <Rows rows={[
                ['Когда', whenLabel(l.start)],
                ['Предмет', l.kind === 'intro' ? 'Бесплатное знакомство' : l.subject],
                ['Длительность', minutes(l.durationMin)],
                ['Стоимость', l.price ? rub(l.price) : 'Бесплатно'],
              ]} />
            </Card>
            <Section title="Что дальше">
              <Steps items={[
                { title: 'Запись отправлена', text: l.payment === 'hold' ? 'Деньги заморожены на карте, пока репетитор не ответит.' : 'Знакомство бесплатное, оплата не нужна.', state: 'done' },
                { title: 'Репетитор подтверждает', text: l.confirmBy ? `Ответ ожидается до ${whenLabel(l.confirmBy)}. Если репетитор не ответит, запись отменится, а деньги вернутся.` : 'Мы сообщим, как только репетитор ответит.', state: 'current' },
                { title: 'Ссылка на урок', text: 'Она появится в карточке урока за 10 минут до начала.', state: 'todo' },
              ]} />
            </Section>
            <div className="trk-actions">
              <Button to="/me/lessons" size="lg">Мои уроки</Button>
              <Button to={`/me/lessons/${l.id}`} variant="line" size="lg">Открыть запись</Button>
              <Button to={`/me/chats/new?tutor=${id}`} variant="fill" size="lg" icon="chat">Написать репетитору</Button>
            </div>
          </>
        )}
      </QueryView>
    </AppLayout>
  );
}
