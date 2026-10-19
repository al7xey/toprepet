import { useState } from 'react';
import { api, studentPriceOf } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { StudyRequest } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { fromRub, rub, whenLabel } from '../../lib/format';
import { Button, Dropdown, EmptyState, FormError, LoadingList, Modal, Note, PageHeader, QueryView, SlotPicker, Status, Tabs, TextArea, TextField, useToast } from '../../ui';
import { subjects } from '../../../entities/lesson';
import { RequestCard, REQUEST_STATUS } from './parts';

type Scope = 'feed' | 'mine';
const SUBJECTS = subjects.filter((s) => s !== 'Другой предмет');

/** Заявки учеников и мои отклики для репетитора. */
export default function TutorRequestsPage() {
  const toast = useToast();
  const [scope, setScope] = useState<Scope>('feed');
  const [subject, setSubject] = useState<string | null>(null);
  const [responding, setResponding] = useState<StudyRequest | null>(null);
  const profile = useQuery('my-profile', () => api.getMyProfile());
  const feed = useQuery(`open-requests-${subject ?? 'all'}`, () => api.listOpenRequests(subject));
  const mine = useQuery('my-responses', () => api.listMyResponses());
  const answered = new Set((mine.data ?? []).map((x) => x.requestId));
  const published = profile.data?.status === 'published';

  return (
    <AppLayout role="tutor">
      <PageHeader title="Заявки" />
      {profile.data && !published && <Note tone="info" icon="edit" action={<Button size="s" to="/tutor/profile/edit">Заполнить анкету</Button>}>Откликаться можно после публикации анкеты.</Note>}
      <Tabs<Scope> items={[{ value: 'feed', label: 'Новые заявки' }, { value: 'mine', label: 'Мои отклики', count: mine.data?.length }]} value={scope} onChange={setScope} />
      {scope === 'feed' ? (
        <>
          <div><Dropdown label="Предмет" icon="book" value={subject} allLabel="Все предметы" options={SUBJECTS.map((s) => ({ value: s, label: s }))} onChange={setSubject} /></div>
          <QueryView query={feed} loading={<LoadingList rows={3} height={200} />} empty={(list) => (list.length ? null : <EmptyState icon="list" title="Новых заявок нет" text="Загляните позже или выберите другой предмет." />)}>
            {(list) => (
              <div className="trk-list">
                {list.map((r) => (
                  <RequestCard key={r.id} request={r} showStatus={false} actions={answered.has(r.id)
                    ? <Status tone="ok" icon="check">Вы откликнулись</Status>
                    : <Button size="s" onClick={() => setResponding(r)} disabled={!published}>Откликнуться</Button>} />
                ))}
              </div>
            )}
          </QueryView>
        </>
      ) : (
        <QueryView query={mine} loading={<LoadingList rows={2} height={200} />} empty={(list) => (list.length ? null : <EmptyState icon="send" title="Откликов пока нет" text="Откликнитесь на подходящую заявку, и она появится здесь." actions={<Button onClick={() => setScope('feed')}>К заявкам</Button>} />)}>
          {(list) => (
            <div className="trk-list">
              {list.map((x) => (
                <RequestCard key={x.id} request={x.request} showStatus={false} actions={<span className="muted sm">{x.status === 'accepted' ? 'Ученик записался к вам' : `Ваш отклик: ${fromRub(x.price)} · ${REQUEST_STATUS[x.request.status].text.toLowerCase()}`}</span>} />
              ))}
            </div>
          )}
        </QueryView>
      )}
      {responding && profile.data && <RespondModal request={responding} defaultPrice={profile.data.price} onClose={() => setResponding(null)} onDone={() => { setResponding(null); toast('Отклик отправлен ученику'); feed.reload(); mine.reload(); }} />}
    </AppLayout>
  );
}

function RespondModal({ request, defaultPrice, onClose, onDone }: { request: StudyRequest; defaultPrice: number; onClose: () => void; onDone: () => void }) {
  const [price, setPrice] = useState(defaultPrice || 1500);
  const [message, setMessage] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<{ price?: string; message?: string }>({});
  const me = useQuery('my-profile', () => api.getMyProfile());
  const from = useState(() => new Date().toISOString())[0];
  const mySlots = useQuery(me.data ? `my-slots-${me.data.slug}` : null, () => api.getTutorSlots(me.data?.slug ?? '', from, 14));
  const send = useMutation((input: { price: number; message: string; slots: string[] }) => api.respondToRequest(request.id, input));

  const submit = async () => {
    const found: { price?: string; message?: string } = {};
    if (!Number.isInteger(price) || price < 300) found.price = 'Цена от 300 ₽ за урок';
    if (!message.trim()) found.message = 'Напишите ученику сообщение';
    setError(found);
    if (found.price || found.message) return;
    if (await send.run({ price, message: message.trim(), slots })) onDone();
  };
  return (
    <Modal open onClose={onClose} width={640} title="Отклик на заявку" footer={<><Button variant="fill" onClick={onClose}>Отмена</Button><Button onClick={submit} loading={send.pending}>Отправить отклик</Button></>}>
      <Note tone="plain" icon="info"><b className="trk-note-title">{request.subject}</b><span className="trk-note-line">{request.level}</span><span className="trk-note-line">{request.budgetMax ? `Бюджет ученика до ${rub(request.budgetMax)}` : 'Бюджет не указан'}</span></Note>
      <TextField label="Ваша цена за урок, ₽" type="number" inputMode="numeric" min={300} step={50} value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} error={error.price} hint={price ? `Ученик увидит ${rub(studentPriceOf(price))}. Вы получите ${rub(price)} за урок` : undefined} />
      <TextArea label="Сообщение ученику" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} error={error.message} hint="Как будете заниматься. Телефоны и ссылки писать нельзя." />
      <div className="g8">
        <b className="label">Время, на которое можно записаться (до 3)</b>
        <SlotPicker slots={mySlots.data ?? []} value={picked} onChange={(start) => { setPicked(start); setSlots((list) => (list.includes(start) || list.length >= 3 ? list : [...list, start])); }} days={14} loading={mySlots.loading && !mySlots.data} />
        {slots.length > 0 && <div className="trk-actions">{slots.map((s) => <button key={s} type="button" className="trk-demo" onClick={() => setSlots(slots.filter((x) => x !== s))} aria-label={`Убрать ${whenLabel(s)}`}>{whenLabel(s)} ✕</button>)}</div>}
      </div>
      <FormError error={send.error} />
    </Modal>
  );
}
