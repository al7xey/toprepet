import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { count, whenLabel } from '../../lib/format';
import { Card, EmptyState, PageHeader, Person, QueryView } from '../../ui';

/** Ученики: с кем были уроки и когда следующий. */
export default function TutorStudentsPage() {
  const students = useQuery('my-students', () => api.listMyStudents());
  return (
    <AppLayout role="tutor">
      <PageHeader title="Ученики" lead="Те, кто записывался к вам на уроки." />
      <QueryView query={students} empty={(items) => (items.length ? null : <EmptyState icon="person-plus" title="Учеников пока нет" text="Когда кто-то запишется на урок или знакомство, он появится здесь." />)}>
        {(items) => (
          <div className="trk-list">
            {items.map((s) => (
              <Card key={s.id}>
                <Person name={s.name} sub={s.note} right={<span className="muted sm trk-right">{s.nextLesson ? `Следующий: ${whenLabel(s.nextLesson)}` : count(s.lessonsCount, 'проведённый урок', 'проведённых урока', 'проведённых уроков')}</span>} />
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
