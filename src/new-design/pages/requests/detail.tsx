import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { StudyRequest } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { Button, ConfirmDialog, EmptyState, FormError, LoadingList, Note, PageHeader, QueryView, Section, useToast } from '../../ui';
import { RequestCard, ResponseCard } from './parts';

/** Заявка и отклики репетиторов: выбрать и записаться прямо отсюда. */
export default function RequestDetailPage() {
  const { id = '' } = useParams();
  const request = useQuery(`request-${id}`, () => api.getRequest(id));
  const responses = useQuery(`responses-${id}`, () => api.listResponses(id));
  return (
    <AppLayout role="student" narrow>
      <QueryView query={request} empty={() => null}>
        {(r) => <Detail request={r} responses={responses} onChange={request.setData} />}
      </QueryView>
    </AppLayout>
  );
}

function Detail({ request, responses, onChange }: { request: StudyRequest; responses: ReturnType<typeof useQuery<Awaited<ReturnType<typeof api.listResponses>>>>; onChange: (r: StudyRequest) => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const close = useMutation(() => api.closeRequest(request.id));
  const open = request.status === 'open';
  const doClose = async () => {
    const done = await close.run();
    if (done) { onChange(done); setConfirm(false); toast('Заявка снята с публикации'); }
  };
  return (
    <>
      <PageHeader title="Заявка" back={{ to: '/me/requests', label: 'Мои заявки' }} />
      {request.status === 'booked' && <Note tone="ok">Вы записались по этой заявке. Уроки — в разделе «Занятия».</Note>}
      {request.status === 'expired' && <Note tone="plain" icon="clock">Срок заявки истёк. Создайте новую, если помощь ещё нужна.</Note>}
      <Section title={`Отклики${responses.data?.length ? ` · ${responses.data.length}` : ''}`}>
        <QueryView
          query={responses}
          loading={<LoadingList rows={2} height={180} />}
          empty={(list) => (list.length ? null : <EmptyState icon="inbox" title="Откликов пока нет" text="Репетиторы увидят заявку и напишут. Обычно первые отклики приходят в течение дня." />)}
        >
          {(list) => (
            <div className="trk-list">
              {list.map((r) => (
                <ResponseCard key={r.id} response={r} bookable={open}
                  bookHref={(start) => `/book/${r.tutorId}?kind=regular&start=${encodeURIComponent(start)}&request=${request.id}`}
                  chatHref={`/me/chats/new?tutor=${r.tutorId}`} />
              ))}
            </div>
          )}
        </QueryView>
      </Section>
      <Section title="Ваша заявка">
        <RequestCard request={request} actions={open ? <Button size="s" variant="line" onClick={() => setConfirm(true)}>Снять с публикации</Button> : undefined} />
      </Section>
      <FormError error={close.error} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={doClose} pending={close.pending} title="Снять заявку с публикации?" text="Репетиторы перестанут её видеть и не смогут откликаться. Уже полученные отклики останутся здесь." confirmLabel="Снять" variant="danger" />
    </>
  );
}
