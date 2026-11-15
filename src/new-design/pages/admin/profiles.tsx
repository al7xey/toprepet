import { useState } from 'react';
import { Document } from './document';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { AdminProfile, TutorDocument } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { rub } from '../../lib/format';
import { Avatar, Button, Card, EmptyState, FormError, Modal, PageHeader, QueryView, Rows, Status, Tags, TextArea, useToast } from '../../ui';

/** Опубликованные и скрытые анкеты с действиями администратора. */
export default function AdminProfilesPage() {
  const queue = useQuery('admin-profiles', () => api.adminProfileQueue());
  const updateDocument = (next: TutorDocument) => queue.setData((prev) => (prev ?? []).map((item) => ({ ...item, documents: item.documents?.map((doc) => doc.id === next.id ? next : doc) })));
  return (
    <AppLayout role="admin">
      <PageHeader title="Анкеты репетиторов" />
      <div className="trk-actions"><Button variant="line" onClick={queue.reload}>Обновить очередь</Button></div>
      <QueryView query={queue} empty={(items) => items.length === 0 ? <EmptyState icon="school" title="Очередь пуста" text="Опубликованные и скрытые анкеты появятся здесь." /> : null}>
        {(items) => <div className="trk-list">{items.map((q) => <Item key={q.tutorId} item={q} onDone={queue.reload} onDocumentChange={updateDocument} />)}</div>}
      </QueryView>
    </AppLayout>
  );
}

function Item({ item, onDone, onDocumentChange }: { item: AdminProfile; onDone: () => void; onDocumentChange: (doc: TutorDocument) => void }) {
  const toast = useToast();
  const p = item.profile;
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const moderate = useMutation((approve: boolean, comment?: string) => api.adminModerateProfile(item.tutorId, approve, comment));
  const act = async (approve: boolean) => {
    if (await moderate.run(approve, note)) { onDone(); setRejecting(false); toast(approve ? 'Анкета доступна ученикам' : 'Анкета скрыта'); }
  };
  return (
    <Card>
      <div className="trk-exrow"><div className="trk-exrow"><Avatar name={p.name} photo={p.photo} size={56} /><div><b>{p.name}</b><br /><span className="muted">{p.headline || 'Без заголовка'}</span></div></div></div>
      <FormError error={moderate.error && !rejecting ? moderate.error : null} />
      {['published', 'review', 'hidden'].includes(p.status) && <div className="trk-actions">
        <Button size="s" icon="check" onClick={() => void act(true)} loading={moderate.pending && !rejecting}>{p.status === "hidden" ? "Восстановить анкету" : "Оставить анкету"}</Button>
        <Button size="s" variant="fill" onClick={() => setRejecting(true)}>Скрыть анкету</Button>
      </div>}
      <Rows rows={[['Почта', item.email || '—'], ['Цена за час', rub(p.price)], ['Знакомство', `${p.introMinutes} мин`], ['Фото', p.photo ? 'Загружено' : 'Нет фото']]} />
      <Status tone={p.status === "hidden" ? "bad" : "ok"}>{p.status === "hidden" ? "Скрыта" : "В каталоге"}</Status>
      <Tags items={p.subjects} />
      {item.documents?.map((doc) => <Document key={doc.id} document={doc} onModerated={onDocumentChange} />)}
      <details className="trk-admin-content"><summary>Содержание анкеты</summary><div className="g16"><p className="cap">{p.about}</p><p>{p.approach}</p>{p.education.map((entry, index) => <div key={index}><b>{entry.title}</b><p>{entry.text}</p></div>)}</div></details>
      <Modal open={rejecting} onClose={() => setRejecting(false)} title="Скрыть анкету?" footer={<><Button variant="fill" onClick={() => setRejecting(false)}>Отмена</Button><Button onClick={() => void act(false)} loading={moderate.pending}>Скрыть</Button></>}>
        <TextArea label="Комментарий" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: загрузите фото, где хорошо видно лицо" />
        <FormError error={moderate.error} />
      </Modal>
    </Card>
  );
}
