import { useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, EmptyState, IconButton, LoadingList, PageHeader, QueryView, Tabs } from '../../ui';
import { RequestCard } from './parts';

type Scope = 'active' | 'closed';

/** Мои заявки: активные и закрытые. */
export default function MyRequestsPage() {
  const [scope, setScope] = useState<Scope>('active');
  const requests = useQuery('my-requests', () => api.listMyRequests());
  return (
    <AppLayout role="student">
      <PageHeader title="Мои заявки" back={{ to: '/me/account', label: 'Профиль' }} actions={<IconButton icon="plus" label="Новая заявка" to="/me/requests/new" className="trk-addbtn" />} />
      <Tabs<Scope> items={[{ value: 'active', label: 'Активные' }, { value: 'closed', label: 'Закрытые' }]} value={scope} onChange={setScope} />
      <QueryView
        query={requests}
        loading={<LoadingList rows={2} height={200} />}
        empty={(all) => {
          const list = all.filter((r) => (scope === 'active') === (r.status === 'open'));
          return list.length ? null : (scope === 'active'
            ? <EmptyState icon="list" title="Активных заявок нет" text="Опишите, что нужно, и репетиторы сами откликнутся с ценой и временем." actions={<Button to="/me/requests/new" size="lg">Создать заявку</Button>} />
            : <EmptyState icon="list" title="Закрытых заявок нет" text="Здесь появятся заявки, по которым вы записались, и закрытые." />);
        }}
      >
        {(all) => (
          <div className="trk-list">
            {all.filter((r) => (scope === 'active') === (r.status === 'open')).map((r) => (
              <RequestCard key={r.id} request={r} actions={<Button size="s" to={`/me/requests/${r.id}`}>{r.responsesCount ? `Отклики · ${r.responsesCount}` : 'Посмотреть отклики'}</Button>} />
            ))}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}
