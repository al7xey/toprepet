import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Card as PayCard, PaymentKind } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { dateLong, rub } from '../../lib/format';
import { AddCardModal, Button, Card, ConfirmDialog, EmptyState, FormError, PageHeader, QueryView, Section, Status, Tabs, useToast, type Tone } from '../../ui';

const KIND: Record<PaymentKind, { tone: Tone; text: string; sign: string }> = {
  hold: { tone: 'wait', text: 'Заморожено', sign: '' },
  charge: { tone: 'ok', text: 'Списано', sign: '−' },
  release: { tone: 'neutral', text: 'Разморожено', sign: '' },
  refund: { tone: 'info', text: 'Возврат', sign: '+' },
};

/** Платежи ученика: история операций и банковские карты. */
export default function PaymentsPage() {
  const [tab, setTab] = useState<'history' | 'cards'>('history');
  return (
    <AppLayout role="student">
      <PageHeader title="Платежи" back={{ to: '/me/account', label: 'Профиль' }} />
      <Tabs items={[{ value: 'history', label: 'История' }, { value: 'cards', label: 'Карты' }]} value={tab} onChange={setTab} />
      {tab === 'history' ? <History /> : <Cards />}
    </AppLayout>
  );
}

function History() {
  const payments = useQuery('my-payments', () => api.listPayments());
  return (
    <QueryView query={payments} empty={(items) => items.length === 0 ? <EmptyState icon="wallet" title="Платежей пока нет" text="Они появятся после первой записи на урок." actions={<Button to="/teachers">Найти репетитора</Button>} /> : null}>
      {(items) => (
        <div className="trk-list">
          {[...items].sort((a, b) => b.at.localeCompare(a.at)).map((p) => (
            <Card key={p.id}>
              <div className="trk-exrow">
                <div><b>{p.title}</b><br /><span className="muted">{dateLong(p.at)} · карта ···· {p.cardLast4}</span></div>
                <div className="trk-right"><b className="tn">{KIND[p.kind].sign}{rub(p.amount)}</b><br /><Status tone={KIND[p.kind].tone}>{KIND[p.kind].text}</Status></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </QueryView>
  );
}

function Cards() {
  const toast = useToast();
  const cards = useQuery('my-cards', () => api.listCards());
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<PayCard | null>(null);
  const remove = useMutation(async (id: string) => { await api.removeCard(id); return true; });
  const confirmRemove = async () => {
    if (!removing) return;
    if (await remove.run(removing.id)) { setRemoving(null); cards.reload(); toast('Карта удалена'); }
  };
  return (
    <Section title="Мои карты" action={<Button icon="plus" onClick={() => setOpen(true)}>Добавить карту</Button>}>
      <QueryView query={cards} empty={(items) => items.length === 0 ? <EmptyState icon="card" title="Карт пока нет" text="Добавьте карту, чтобы записываться на платные уроки." actions={<Button onClick={() => setOpen(true)}>Добавить карту</Button>} /> : null}>
        {(items) => (
          <div className="trk-list">
            {items.map((c) => (
              <Card key={c.id}>
                <div className="trk-exrow">
                  <div><b>{c.brand} ···· {c.last4}</b>{c.primary && <><br /><span className="muted">Основная</span></>}</div>
                  <Button size="s" variant="fill" onClick={() => setRemoving(c)}>Удалить</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryView>
      <FormError error={remove.error} />
      <AddCardModal open={open} onClose={() => setOpen(false)} onAdded={() => { setOpen(false); cards.reload(); toast('Карта добавлена'); }} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} onConfirm={() => void confirmRemove()} title="Удалить карту?" text={removing ? `Карта ${removing.brand} ···· ${removing.last4} будет удалена. Уроки, за которые деньги уже заморожены, не изменятся.` : undefined} confirmLabel="Удалить" variant="danger" pending={remove.pending} />
    </Section>
  );
}
