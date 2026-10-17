import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { whenLabel } from '../../lib/format';
import { Card, EmptyState, PageHeader, QueryView, Status } from '../../ui';

/** Отмены уроков: кто отменил, почему и была ли отмена поздней (меньше 4 часов до начала). */
export default function AdminCancellationsPage() {
  const list = useQuery('admin-cancellations', () => api.adminCancellations());
  return (
    <AppLayout role="admin">
      <PageHeader title="Отмены" lead="Поздние отмены ученика (меньше чем за 4 часа) оплачиваются репетитору. Отмены репетитора всегда возвращают деньги." />
      <QueryView query={list} empty={(items) => items.length === 0 ? <EmptyState icon="x" title="Отмен пока нет" /> : null}>
        {(items) => (
          <div className="trk-list">
            {items.map((c) => (
              <Card key={c.lessonId}>
                <div className="trk-exrow">
                  <div><b>{c.studentName} → {c.tutorName}</b><br /><span className="muted">Урок {whenLabel(c.at)} · отменил{c.by === 'tutor' ? ' репетитор' : c.by === 'admin' ? 'а поддержка' : ' ученик'}</span></div>
                  {c.late ? <Status tone="bad">Поздняя отмена</Status> : <Status tone="ok">Без штрафа</Status>}
                </div>
                {c.reason && <p className="cap">Причина: {c.reason}</p>}
              </Card>
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
