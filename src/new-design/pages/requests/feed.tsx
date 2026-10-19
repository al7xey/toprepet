import { useState } from 'react';
import { subjects } from '../../../entities/lesson';
import { api } from '../../api';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { Button, Dropdown, EmptyState, LoadingList, PageHeader, QueryView } from '../../ui';
import { RequestCard } from './parts';

const SUBJECTS = subjects.filter((s) => s !== 'Другой предмет');

/** Лента заявок для всех: репетитор видит, чего ищут ученики. Откликнуться можно после входа в кабинет репетитора. */
export default function RequestsFeedPage() {
  const { user } = useSession();
  const [subject, setSubject] = useState<string | null>(null);
  const feed = useQuery(`open-requests-${subject ?? 'all'}`, () => api.listOpenRequests(subject));
  const respond = user?.role === 'tutor'
    ? <Button size="s" to="/tutor/requests">Откликнуться</Button>
    : !user ? <Button size="s" to={`/login?next=${encodeURIComponent('/tutor/requests')}`}>Войти и откликнуться</Button> : null;
  return (
    <PublicLayout tight>
      <PageHeader title="Заявки учеников" />
      <div><Dropdown label="Предмет" icon="book" value={subject} allLabel="Все предметы" options={SUBJECTS.map((s) => ({ value: s, label: s }))} onChange={setSubject} /></div>
      <QueryView query={feed} loading={<LoadingList rows={3} height={200} />} empty={(list) => (list.length ? null : <EmptyState icon="list" title="Заявок по этому предмету нет" text="Загляните позже или выберите другой предмет." />)}>
        {(list) => <div className="trk-list">{list.map((r) => <RequestCard key={r.id} request={r} forTutor showStatus={false} actions={respond} />)}</div>}
      </QueryView>
    </PublicLayout>
  );
}
