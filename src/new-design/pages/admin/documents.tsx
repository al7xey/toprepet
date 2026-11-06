import { useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, Card, EmptyState, PageHeader, QueryView } from '../../ui';
import { Document } from './document';

export default function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const cursor = params.get('cursor') ?? '';
  const queue = useQuery('admin-documents-' + cursor, () =>
    api.adminDocuments(cursor),
  );
  return (
    <AppLayout role="admin">
      <PageHeader title="Проверка документов" />
      <div className="trk-actions">
        {cursor && (
          <Button variant="line" onClick={() => setParams({})}>
            К началу очереди
          </Button>
        )}
        <Button variant="line" onClick={queue.reload}>
          Обновить очередь
        </Button>
      </div>
      <QueryView
        query={queue}
        empty={(page) =>
          page.items.length ? null : (
            <EmptyState
              icon="doc"
              title={
                cursor
                  ? 'На этой странице документов нет'
                  : 'Документы проверены'
              }
            />
          )
        }
      >
        {(page) => (
          <div className="trk-list">
            {page.items.map((doc) => (
              <Card key={doc.id}>
                <p className="muted">{doc.tutorName}</p>
                <Document
                  document={doc}
                  onModerated={(next) =>
                    queue.setData((prev) => ({
                      items: (prev?.items ?? []).map((item) =>
                        item.id === next.id ? { ...item, ...next } : item,
                      ),
                      nextCursor: prev?.nextCursor ?? null,
                    }))
                  }
                />
              </Card>
            ))}
            <div className="trk-actions">
              {page.nextCursor && (
                <Button onClick={() => setParams({ cursor: page.nextCursor! })}>
                  Следующие документы
                </Button>
              )}
            </div>
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
