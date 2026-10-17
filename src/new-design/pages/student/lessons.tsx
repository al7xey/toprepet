import { useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, EmptyState, LessonCard, LoadingList, PageHeader, QueryView, Tabs } from '../../ui';

type Scope = 'upcoming' | 'past';

/** Мои уроки: предстоящие и прошедшие. */
export default function LessonsPage() {
  const [scope, setScope] = useState<Scope>('upcoming');
  const lessons = useQuery(`lessons-${scope}`, () => api.listLessons(scope));
  return (
    <AppLayout role="student">
      <PageHeader title="Мои уроки" actions={<Button to="/teachers" variant="line" icon="search">Найти репетитора</Button>} />
      <Tabs<Scope> items={[{ value: 'upcoming', label: 'Предстоящие' }, { value: 'past', label: 'Прошедшие' }]} value={scope} onChange={setScope} />
      <QueryView
        query={lessons}
        loading={<LoadingList rows={3} height={132} />}
        empty={(items) => (items.length ? null : (
          scope === 'upcoming'
            ? <EmptyState icon="cal" title="Пока нет уроков" text="Выберите репетитора в каталоге и запишитесь на бесплатное знакомство или на урок." actions={<Button to="/teachers" size="lg">Найти репетитора</Button>} />
            : <EmptyState icon="cal" title="Прошедших уроков пока нет" text="Здесь появятся состоявшиеся и отменённые уроки." />
        ))}
      >
        {(items) => <div className="trk-list">{items.map((l, i) => <LessonCard key={l.id} lesson={l} role="student" delay={i * 0.05} />)}</div>}
      </QueryView>
    </AppLayout>
  );
}
