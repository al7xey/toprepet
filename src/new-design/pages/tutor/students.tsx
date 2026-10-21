import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { whenLabel } from '../../lib/format';
import { Card, EmptyState, PageHeader, Person, QueryView, Rows } from '../../ui';

/** Ученики: с кем были уроки и когда следующий. */
export default function TutorStudentsPage() {
  const students = useQuery('my-students', () => api.listMyStudents());
  return (
    <AppLayout role="tutor">
      <PageHeader title="Ученики" back={{ to: '/tutor/account', label: 'Профиль' }} />
      <QueryView query={students} empty={(items) => (items.length ? null : <EmptyState icon="person-plus" title="Учеников пока нет" text="Когда кто-то запишется на урок или знакомство, он появится здесь." />)}>
        {(items) => (
          <div className="trk-list">
            {items.map((s) => (
              <Card key={s.id} pad="sm">
                <Person name={s.name} sub={s.note} />
                <Rows boxed rows={[['Следующий урок', s.nextLesson ? whenLabel(s.nextLesson) : 'Не назначен'], ['Всего уроков', String(s.lessonsCount)]]} />
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
