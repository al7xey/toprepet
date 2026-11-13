import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, LESSON_MINUTES, staticTutors, type Card as PayCard, type Tutor } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { minutes, rub, whenLabel } from '../../lib/format';
import { AddCardModal, Button, Card, Checkbox, CardTitle, EmptyState, FormError, IconButton, PageHeader, QueryView, Rows, Section, SelectField, SlotPicker } from '../../ui';

/** Запись на урок или бесплатное знакомство: проверить сводку, выбрать карту и подтвердить. */
export default function BookPage() {
  const { id = '' } = useParams();
  const initial = useMemo(() => staticTutors().find((t) => t.id === id), [id]);
  const tutor = useQuery(`tutor-${id}`, () => api.getTutor(id), initial);
  return (
    <AppLayout role="student" narrow>
      <QueryView query={tutor} empty={() => null}>
        {(t) => <BookForm key={id} tutor={t} />}
      </QueryView>
    </AppLayout>
  );
}

function BookForm({ tutor }: { tutor: Tutor }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantIntro = params.get('kind') === 'intro' && tutor.introMinutes > 0;
  const kind: 'intro' | 'regular' = wantIntro ? 'intro' : 'regular';
  const requestId = params.get('request') ?? undefined;
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const responses = useQuery(requestId ? 'booking-response-' + requestId : null, () => api.listResponses(requestId!));
  const response = responses.data?.find((r) => r.tutorId === tutor.id);
  const [start, setStart] = useState<string | null>(() => {
    const value = params.get('start');
    return value && Number.isFinite(Date.parse(value)) && Date.parse(value) > Date.now() ? value : null;
  });
  const [subject, setSubject] = useState(tutor.subjects[0] ?? '');
  const [agree, setAgree] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const durations = tutor.durations?.length ? tutor.durations : [LESSON_MINUTES];
  const [regularDuration, setRegularDuration] = useState(durations.includes(LESSON_MINUTES) ? LESSON_MINUTES : durations[0]);
  const duration = kind === 'intro' ? tutor.introMinutes : regularDuration;
  const from = useMemo(() => new Date().toISOString(), []);
  const slots = useQuery(`slots-${tutor.id}-${duration}`, () => api.getTutorSlots(tutor.id, from, 14, duration));
  const cards = useQuery('cards', () => api.listCards());
  const book = useMutation((input: Parameters<typeof api.createBooking>[0]) => api.createBooking(input));

  const total = kind === 'intro' ? 0 : Math.round((response?.price ?? tutor.studentPrice) * duration / 60);
  const list = cards.data ?? [];
  const card = list.find((c) => c.id === cardId) ?? list.find((c) => c.primary) ?? list[0] ?? null;
  const needCard = kind === 'regular';
  const problems = { start: !start, card: needCard && !card, agree: !agree };

  const submit = async () => {
    setShowErrors(true);
    if (problems.start || problems.card || problems.agree || !start) return;
    if (requestId && !response) return;
    const input = { tutorId: tutor.id, kind, start, durationMin: duration, subject, cardId: card?.id, requestId };
    const signature = JSON.stringify(input);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    const lesson = await book.run({ ...input, idempotencyKey: attempt.current.key });
    if (lesson) void navigate(`/book/${tutor.id}/done?lesson=${lesson.id}`, { replace: true });
  };

  return (
    <>
      <PageHeader title={kind === 'intro' ? 'Запись на знакомство' : 'Запись на урок'} back={{ to: `/teachers/${tutor.id}/`, label: 'К анкете' }} lead={`${tutor.name} · ${tutor.cardSubjects}`} />
      {kind === 'regular' && durations.length > 1 && <SelectField label="Длительность занятия" value={regularDuration} onChange={(e) => { setRegularDuration(Number(e.target.value)); setStart(null); }} options={durations.map((d) => ({ value: String(d), label: minutes(d) }))} />}
      <Section title="Когда">
        <Card>
          <QueryView query={slots} loading={<SlotPicker slots={[]} value={start} onChange={setStart} days={14} loading />}>
            {(items) => <SlotPicker slots={items} value={start} onChange={setStart} days={14} />}
          </QueryView>
          {showErrors && problems.start && <span className="trk-error">Выберите время</span>}
        </Card>
      </Section>
      {tutor.subjects.length > 1 && <SelectField label="Предмет" value={subject} onChange={(e) => setSubject(e.target.value)} options={tutor.subjects} />}
      <Section title="Итог">
        <Card className="trk-summary">
          <Rows boxed rows={[
            ['Репетитор', tutor.name],
            ['Предмет', subject],
            ['Когда', start ? whenLabel(start) : 'Время не выбрано'],
            ['Длительность', minutes(duration)],
          ]} />
          <div className="trk-total"><span>К оплате</span><b className="tn trk-price-xl">{kind === 'intro' ? 'Бесплатно' : rub(total)}</b></div>
          {kind === 'regular' && (
            <>
              <div className="trk-pay-head"><CardTitle>Способ оплаты</CardTitle><IconButton icon="plus" label="Добавить способ оплаты" onClick={() => setCardOpen(true)} className="trk-addbtn" /></div>
              <QueryView query={cards} loading={<span className="muted">Загружаем карты…</span>}>
                {(items) => items.length ? (
                  <div className="trk-cards-list">
                    {items.map((c) => <CardRow key={c.id} card={c} active={c.id === card?.id} onPick={() => setCardId(c.id)} />)}
                  </div>
                ) : <EmptyState icon="card" title="Карты пока нет" text="Нажмите «+», чтобы добавить карту." />}
              </QueryView>
              {showErrors && problems.card && <span className="trk-error">Добавьте карту, чтобы записаться</span>}
              <p className="muted sm trk-pay-note">Деньги замораживаются при записи и списываются после подтверждения репетитором. Бесплатная отмена за 4 часа до начала.</p>
            </>
          )}
          <div>
            <Checkbox checked={agree} onChange={setAgree}>Согласен(на) с правилами отмены и переноса</Checkbox>
            {showErrors && problems.agree && <span className="trk-error">Подтвердите согласие</span>}
          </div>
          <FormError error={book.error ?? responses.error ?? (requestId && !responses.loading && !response ? 'Отклик больше недоступен. Вернитесь к заявке.' : null)} />
          <Button size="lg" block onClick={submit} disabled={Boolean(requestId && (!response || responses.loading))} loading={book.pending}>{kind === 'intro' ? 'Записаться на знакомство' : 'Записаться'}</Button>
        </Card>
      </Section>
      <AddCardModal open={cardOpen} onClose={() => setCardOpen(false)} onAdded={(c) => { setCardId(c.id); cards.reload(); setCardOpen(false); }} />
    </>
  );
}

function CardRow({ card, active, onPick }: { card: PayCard; active: boolean; onPick: () => void }) {
  return (
    <label className={`trk-cardrow${active ? ' on' : ''}`}>
      <input type="radio" name="card" className="trk-sr" checked={active} onChange={onPick} />
      <span><b>{card.brand}</b> ···· {card.last4}</span>
      {card.primary && <span className="muted sm">основная</span>}
    </label>
  );
}
