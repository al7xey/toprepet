import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { AdminProfile } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { rub } from '../../lib/format';
import { Avatar, Button, Card, EmptyState, FormError, Modal, PageHeader, QueryView, Rows, Tags, TextArea, useToast } from '../../ui';

/** Анкеты репетиторов на проверке: опубликовать или вернуть с комментарием. */
export default function AdminProfilesPage() {
  const queue = useQuery('admin-profiles', () => api.adminProfileQueue());
  return (
    <AppLayout role="admin">
      <PageHeader title="Анкеты на проверке" lead="Проверьте фото, описание, предметы и цену. Если что-то нужно исправить, напишите репетитору." />
      <QueryView query={queue} empty={(items) => items.length === 0 ? <EmptyState icon="school" title="Очередь пуста" text="Новые анкеты появятся здесь после отправки репетитором." /> : null}>
        {(items) => <div className="trk-list">{items.map((q) => <Item key={q.tutorId} item={q} onDone={() => queue.setData((prev) => (prev ?? []).filter((x) => x.tutorId !== q.tutorId))} />)}</div>}
      </QueryView>
    </AppLayout>
  );
}

function Item({ item, onDone }: { item: AdminProfile; onDone: () => void }) {
  const toast = useToast();
  const p = item.profile;
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const moderate = useMutation((approve: boolean, comment?: string) => api.adminModerateProfile(item.tutorId, approve, comment));
  const act = async (approve: boolean) => {
    if (await moderate.run(approve, note)) { onDone(); setRejecting(false); toast(approve ? 'Анкета опубликована' : 'Анкета возвращена репетитору'); }
  };
  return (
    <Card>
      <div className="trk-exrow"><div className="trk-exrow"><Avatar name={p.name} photo={p.photo} size={56} /><div><b>{p.name}</b><br /><span className="muted">{p.headline || 'Без заголовка'}</span></div></div></div>
      <Rows rows={[['Почта', item.email || '—'], ['Цена за час', rub(p.price)], ['Знакомство', `${p.introMinutes} мин`], ['Фото', p.photo ? 'Загружено' : 'Нет фото']]} />
      <Tags items={p.subjects} />
      <p className="cap">{p.about}</p>
      <FormError error={moderate.error && !rejecting ? moderate.error : null} />
      <div className="trk-actions">
        <Button size="s" icon="check" onClick={() => void act(true)} loading={moderate.pending && !rejecting}>Опубликовать</Button>
        <Button size="s" variant="fill" onClick={() => setRejecting(true)}>Вернуть на доработку</Button>
      </div>
      <Modal open={rejecting} onClose={() => setRejecting(false)} title="Что нужно исправить?" footer={<><Button variant="fill" onClick={() => setRejecting(false)}>Отмена</Button><Button onClick={() => void act(false)} loading={moderate.pending}>Отправить репетитору</Button></>}>
        <TextArea label="Комментарий" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: загрузите фото, где хорошо видно лицо" />
        <FormError error={moderate.error} />
      </Modal>
    </Card>
  );
}
