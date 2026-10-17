import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Review } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago } from '../../lib/format';
import { Button, Card, EmptyState, FormError, PageHeader, QueryView, Stars, useToast } from '../../ui';

/** Очередь отзывов: опубликовать или отклонить. Опубликованный отзыв сразу меняет рейтинг репетитора. */
export default function AdminReviewsPage() {
  const queue = useQuery('admin-reviews', () => api.adminReviewQueue());
  return (
    <AppLayout role="admin">
      <PageHeader title="Отзывы на проверке" lead="Не публикуем отзывы с контактами, ссылками, оскорблениями и рекламой." />
      <QueryView query={queue} empty={(items) => items.length === 0 ? <EmptyState icon="star" title="Очередь пуста" text="Новые отзывы появятся здесь после урока." /> : null}>
        {(items) => <div className="trk-list">{items.map((r) => <Item key={r.id} review={r} onDone={() => queue.setData((prev) => (prev ?? []).filter((x) => x.id !== r.id))} />)}</div>}
      </QueryView>
    </AppLayout>
  );
}

function Item({ review, onDone }: { review: Review; onDone: () => void }) {
  const toast = useToast();
  const moderate = useMutation((approve: boolean) => api.adminModerateReview(review.id, approve));
  const act = async (approve: boolean) => { if (await moderate.run(approve)) { onDone(); toast(approve ? 'Отзыв опубликован' : 'Отзыв отклонён'); } };
  return (
    <Card>
      <div className="trk-exrow"><div><b>{review.authorName}</b><br /><span className="muted">{review.authorNote} · {ago(review.createdAt)}</span></div><Stars value={review.rating} label /></div>
      <p className="cap">{review.text}</p>
      <FormError error={moderate.error} />
      <div className="trk-actions">
        <Button size="s" icon="check" onClick={() => void act(true)} loading={moderate.pending}>Опубликовать</Button>
        <Button size="s" variant="fill" onClick={() => void act(false)} disabled={moderate.pending}>Отклонить</Button>
      </div>
    </Card>
  );
}
