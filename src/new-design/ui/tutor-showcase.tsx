import type { Query } from '../api/hooks';
import type { Tutor } from '../api/types';
import { TutorGrid } from './domain';
import { Button, EmptyState, ErrorState, LoadingList } from './kit';

/** Landing pages must not present build-time sample cards as a successful API response. */
export function TutorShowcase({ query }: { query: Query<Tutor[]> }) {
  if (query.loading) return <LoadingList rows={1} height={320} />;
  if (query.error) return <ErrorState text={query.error} onRetry={query.reload} />;
  if (!query.data) return <LoadingList rows={1} height={320} />;
  if (!query.data.length) return <EmptyState icon="search" title="Анкеты скоро появятся" text="Пока нет опубликованных анкет. Загляните позже или откройте раздел помощи." actions={<Button to="/help" variant="line">Помощь</Button>} />;
  return <TutorGrid tutors={query.data} layout="row" />;
}
