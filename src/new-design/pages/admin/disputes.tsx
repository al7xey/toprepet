import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Dispute, Lesson } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { ago, rub, whenLabel } from '../../lib/format';
import { Button, Card, CardTitle, ConfirmDialog, EmptyState, FormError, PageHeader, QueryView, Rows, Status, Tabs, useToast, type Tone } from '../../ui';

type Item = Dispute & { lesson: Lesson };
const OPEN = (d: Dispute) => d.status === 'open' || d.status === 'tutor_replied';
const STATUS: Record<Dispute['status'], { tone: Tone; text: string }> = {
  open: { tone: 'wait', text: 'Ждём репетитора' },
  tutor_replied: { tone: 'info', text: 'Нужно решение' },
  resolved_refund: { tone: 'ok', text: 'Возврат ученику' },
  resolved_paid: { tone: 'ok', text: 'Выплата репетитору' },
};

/** Споры по урокам: прочитать обе стороны и принять решение. */
export default function AdminDisputesPage() {
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const list = useQuery('admin-disputes', () => api.adminDisputes());
  const count = list.data?.filter(OPEN).length ?? 0;
  return (
    <AppLayout role="admin">
      <PageHeader title="Споры" />
      <Tabs items={[{ value: 'open', label: 'Открытые', count }, { value: 'done', label: 'Решённые' }]} value={tab} onChange={setTab} />
      <QueryView query={list} empty={() => null}>
        {(items) => {
          const shown = items.filter((d) => (tab === 'open' ? OPEN(d) : !OPEN(d)));
          return shown.length === 0
            ? <EmptyState icon="flag" title={tab === 'open' ? 'Открытых споров нет' : 'Решённых споров пока нет'} />
            : <div className="trk-list">{shown.map((d) => <DisputeCard key={d.id} item={d} onChange={(next) => list.setData((prev) => (prev ?? []).map((x) => (x.id === next.id ? { ...x, ...next } : x)))} />)}</div>;
        }}
      </QueryView>
    </AppLayout>
  );
}

function DisputeCard({ item, onChange }: { item: Item; onChange: (d: Dispute) => void }) {
  const toast = useToast();
  const [outcome, setOutcome] = useState<'refund' | 'pay' | null>(null);
  const resolve = useMutation((value: 'refund' | 'pay') => api.adminResolveDispute(item.id, value));
  const confirm = async () => {
    if (!outcome) return;
    const done = await resolve.run(outcome);
    if (done) { onChange(done); setOutcome(null); toast('Решение сохранено, стороны получили уведомление'); }
  };
  const l = item.lesson;
  return (
    <Card>
      <div className="trk-exrow"><CardTitle>{item.reason}</CardTitle><Status tone={STATUS[item.status].tone}>{STATUS[item.status].text}</Status></div>
      <p className="cap">{item.text}</p>
      <Rows rows={[
        ['Урок', `${l.subject}, ${whenLabel(l.start)}`],
        ['Ученик', l.studentName],
        ['Репетитор', l.tutorName],
        ['Сумма', rub(l.price)],
        ['Создан', ago(item.createdAt)],
      ]} />
      {item.tutorReply ? <div className="trk-reply"><b>Ответ репетитора</b><p className="cap">{item.tutorReply}</p></div> : OPEN(item) && <p className="muted">Репетитор ещё не ответил. Можно принять решение и без ответа.</p>}
      {item.resolution && <p className="cap"><b>Решение:</b> {item.resolution}</p>}
      {OPEN(item) && (
        <div className="trk-actions">
          <Button size="s" onClick={() => setOutcome('refund')}>Вернуть деньги ученику</Button>
          <Button size="s" variant="line" onClick={() => setOutcome('pay')}>Выплатить репетитору</Button>
        </div>
      )}
      <FormError error={resolve.error} />
      <ConfirmDialog open={!!outcome} onClose={() => setOutcome(null)} onConfirm={() => void confirm()} pending={resolve.pending}
        title={outcome === 'refund' ? 'Вернуть деньги ученику?' : 'Выплатить репетитору?'}
        text={outcome === 'refund' ? `${l.studentName} получит ${rub(l.price)} обратно на карту.` : `${l.tutorName} получит оплату за урок.`} confirmLabel="Подтвердить" />
    </Card>
  );
}
