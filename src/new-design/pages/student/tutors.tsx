import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Person,
  QueryView,
  Rows,
} from '../../ui';
import { whenLabel } from '../../lib/format';
export default function MyTutorsPage() {
  const tutors = useQuery('my-tutors', () => api.listMyTutors());
  return (
    <AppLayout role="student">
      <PageHeader
        title="Мои репетиторы"
        back={{ to: '/me/account', label: 'Профиль' }}
      />
      <QueryView
        query={tutors}
        empty={(items) =>
          items.length ? null : (
            <EmptyState
              icon="school"
              title="Репетиторов пока нет"
              text="Здесь появятся репетиторы, к которым вы записались."
              actions={<Button to="/teachers">Найти репетитора</Button>}
            />
          )
        }
      >
        {(items) => (
          <div className="trk-list">
            {items.map((t) => (
              <Card key={t.tutorId}>
                <Person name={t.name} sub={t.subject} />
                <Rows
                  rows={[
                    ['Уроков', String(t.lessonsCount)],
                    [
                      'Последний урок',
                      t.lastLesson ? whenLabel(t.lastLesson) : 'Не было',
                    ],
                  ]}
                />
                <div className="trk-actions">
                  <Button to={`/teachers/${t.tutorId}`}>Открыть анкету</Button>
                  <Button
                    variant="line"
                    to={`/me/chats/new?tutor=${encodeURIComponent(t.tutorId)}`}
                  >
                    Написать
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
