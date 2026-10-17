import { useState, type SyntheticEvent } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { dateLong, rub } from '../../lib/format';
import { Button, Card, EmptyState, FormError, PageHeader, QueryView, Section, Stats, Status, TextField, useToast } from '../../ui';

const ENTRY: Record<'pending' | 'paid' | 'held', { tone: 'wait' | 'ok' | 'neutral'; text: string }> = {
  pending: { tone: 'wait', text: 'К выплате' },
  paid: { tone: 'ok', text: 'Выплачено' },
  held: { tone: 'neutral', text: 'Ждёт подтверждения' },
};

/** Финансы: сколько заработано, что ждёт выплаты, реквизиты самозанятого. */
export default function FinancePage() {
  const finance = useQuery('my-finance', () => api.getFinance());
  return (
    <AppLayout role="tutor" narrow>
      <PageHeader title="Финансы" />
      <QueryView query={finance}>
        {(f) => (
          <>
            <Card><Stats items={[[rub(f.available), 'к выплате'], [rub(f.pending), 'ждёт урока'], [rub(f.paidThisMonth), 'выплачено в этом месяце']]} /></Card>
            <Section title="Операции">
              {f.entries.length === 0 ? <EmptyState icon="wallet" title="Выплат пока нет" text="После первого проведённого урока здесь появятся начисления." /> : (
                <div className="trk-list">
                  {f.entries.map((e) => (
                    <Card key={e.id}><div className="trk-exrow"><div><b>{e.title}</b><br /><span className="muted">{dateLong(e.at)}</span></div><div className="trk-right"><b className="tn">{rub(e.amount)}</b><br /><Status tone={ENTRY[e.status].tone}>{ENTRY[e.status].text}</Status></div></div></Card>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </QueryView>
      <Section title="Реквизиты для выплат"><PayoutForm /></Section>
    </AppLayout>
  );
}

/** Реквизиты самозанятого. В демо — поля ввода; с настоящим бэкендом номер карты вводится в виджете провайдера выплат. */
function PayoutForm() {
  const toast = useToast();
  const payout = useQuery('my-payout', () => api.getPayoutSettings());
  const [inn, setInn] = useState('');
  const [card, setCard] = useState('');
  const [touched, setTouched] = useState(false);
  const save = useMutation((input: { inn: string; cardNumber: string }) => api.savePayoutSettings(input));
  const current = payout.data;
  const innValue = touched ? inn : (current?.inn ?? '');
  const innBad = innValue !== '' && !/^\d{12}$/.test(innValue);

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    const done = await save.run({ inn: innValue, cardNumber: card });
    if (done) { payout.setData(done); setCard(''); setTouched(false); toast('Реквизиты сохранены'); }
  };
  return (
    <Card>
      <form className="trk-form" onSubmit={submit} noValidate>
        <TextField label="ИНН" inputMode="numeric" maxLength={12} value={innValue} onChange={(e) => { setTouched(true); setInn(e.target.value.replace(/\D/g, '')); }} error={innBad ? 'ИНН самозанятого — 12 цифр' : undefined} hint="12 цифр" />
        <TextField label="Карта для выплат" inputMode="numeric" autoComplete="cc-number" placeholder={current?.cardLast4 ? `···· ${current.cardLast4}` : '0000 0000 0000 0000'} value={card} onChange={(e) => setCard(e.target.value)} hint={current?.cardLast4 ? `Сейчас: карта ···· ${current.cardLast4}. Введите новую, чтобы заменить.` : 'Демо-режим: карта не списывается'} />
        <FormError error={save.error} />
        <div className="trk-actions"><Button type="submit" loading={save.pending} disabled={innBad || !innValue || card.replace(/\D/g, '').length < 16}>Сохранить реквизиты</Button></div>
      </form>
    </Card>
  );
}
