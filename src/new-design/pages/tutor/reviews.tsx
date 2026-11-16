import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Review } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago } from '../../lib/format';
import { Button, Card, EmptyState, FormError, PageHeader, QueryView, Stars, TextArea, useToast } from '../../ui';

/** Отзывы о репетиторе: можно ответить один раз. Видны только опубликованные. */
export default function TutorReviewsPage() {
  const reviews = useQuery('my-reviews', () => api.listMyReviews());
  return (
    <AppLayout role="tutor" narrow>
      <PageHeader title="Отзывы" back={{ to: '/tutor/account', label: 'Профиль' }} />
      <QueryView query={reviews} empty={(items) => items.every((r) => r.status !== 'published') ? <EmptyState icon="star" title="Отзывов пока нет" text="Первый отзыв появится после проведённого урока." /> : null}>
        {(items) => (
          <div className="trk-list">
            {items.filter((r) => r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => <ReviewItem key={r.id} review={r} onChange={(next) => reviews.setData((prev) => (prev ?? []).map((x) => (x.id === next.id ? next : x)))} />)}
          </div>
        )}
      </QueryView>
    </AppLayout>
  );
}

function ReviewItem({ review, onChange }: { review: Review; onChange: (r: Review) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const reply = useMutation(() => api.replyReview(review.id, text.trim()));
  const send = async () => {
    if (text.trim().length < 3) return;
    const done = await reply.run();
    if (done) { onChange(done); setOpen(false); toast('Ответ опубликован'); }
  };
  return (
    <Card>
      <div className="trk-exrow"><div><b>{review.authorName}</b><br /><span className="muted">{review.authorNote} · {ago(review.createdAt)}</span></div><Stars value={review.rating} label /></div>
      <p className="cap">{review.text}</p>
      {review.reply ? <div className="trk-reply"><b>Ваш ответ</b><p className="cap">{review.reply}</p></div> : open ? (
        <form className="trk-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
          <TextArea label="Ответ на отзыв" rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} />
          <FormError error={reply.error} />
          <div className="trk-actions"><Button type="submit" size="s" loading={reply.pending} disabled={text.trim().length < 3}>Ответить</Button><Button size="s" variant="fill" onClick={() => setOpen(false)}>Отмена</Button></div>
        </form>
      ) : <div className="trk-actions"><Button size="s" variant="line" icon="chat" onClick={() => setOpen(true)}>Ответить</Button></div>}
    </Card>
  );
}
