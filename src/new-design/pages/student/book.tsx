import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, LESSON_MINUTES, staticTutors, type Card as PayCard, type Tutor } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { minutes, rub, whenLabel } from '../../lib/format';
import { AddCardModal, Button, Card, Checkbox, CardTitle, EmptyState, FormError, Note, PageHeader, QueryView, Rows, Section, SelectField, SlotPicker } from '../../ui';

/** Запись на урок или бесплатное знакомство: проверить сводку, выбрать карту и подтвердить. */
export default function BookPage() {
  const { id = '' } = useParams();
  const initial = useMemo(() => staticTutors().find((t) => t.id === id), [id]);
  const tutor = useQuery(`tutor-${id}`, () => api.getTutor(id), initial);
  return (
    <AppLayout role="student" narrow>
      <QueryView query={tutor} empty={() => null}>
        {(t) => <BookForm tutor={t} />}
      </QueryView>
    </AppLayout>
  );
}

function BookForm({ tutor }: { tutor: Tutor }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantIntro = params.get('kind') === 'intro' && tutor.introMinutes > 0;
  const kind = wantIntro ? 'intro' : 'regular';
  const requestId = params.get('request') ?? undefined;
  const [start, setStart] = useState<string | null>(params.get('start'));
  const [subject, setSubject] = useState(tutor.subjects[0] ?? '');
  const [agree, setAgree] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const from = useMemo(() => new Date().toISOString(), []);
  const slots = useQuery(`slots-${tutor.id}`, () => api.getTutorSlots(tutor.id, from, 14));
  const cards = useQuery('cards', () => api.listCards());
  const book = useMutation((input: Parameters<typeof api.createBooking>[0]) => api.createBooking(input));

  const duration = kind === 'intro' ? tutor.introMinutes : LESSON_MINUTES;
  const total = kind === 'intro' ? 0 : tutor.studentPrice;
  const list = cards.data ?? [];
  const card = list.find((c) => c.id === cardId) ?? list.find((c) => c.primary) ?? list[0] ?? null;
  const needCard = kind === 'regular';
  const problems = { start: !start, card: needCard && !card, agree: !agree };

  const submit = async () => {
    setShowErrors(true);
    if (problems.start || problems.card || problems.agree || !start) return;
    const lesson = await book.run({ tutorId: tutor.id, kind, start, durationMin: duration, subject, cardId: card?.id, requestId });
    if (lesson) void navigate(`/book/${tutor.id}/done?lesson=${lesson.id}`, { replace: true });
  };

  return (
    <>
      <PageHeader title={kind === 'intro' ? 'Запись на знакомство' : 'Запись на урок'} back={{ to: `/teachers/${tutor.id}/`, label: 'К анкете' }} lead={`${tutor.name} · ${tutor.cardSubjects}`} />
      <Section title="Когда">
        <Card>
          <SlotPicker slots={slots.data ?? []} value={start} onChange={setStart} days={14} loading={slots.loading && !slots.data} />
          {showErrors && problems.start && <span className="trk-error">Выберите время</span>}
        </Card>
      </Section>
      {tutor.subjects.length > 1 && <SelectField label="Предмет" value={subject} onChange={(e) => setSubject(e.target.value)} options={tutor.subjects} />}
      <Section title="Итог">
        <Card className="trk-summary">
          <Rows rows={[
            ['Репетитор', tutor.name],
            ['Предмет', subject],
            ['Когда', start ? whenLabel(start) : 'Время не выбрано'],
            ['Длительность', minutes(duration)],
          ]} />
          <div className="trk-total"><span>К оплате</span><b className="tn trk-price-xl">{kind === 'intro' ? 'Бесплатно' : rub(total)}</b></div>
          {kind === 'regular' && (
            <>
              <CardTitle>Способ оплаты</CardTitle>
              <QueryView query={cards} loading={<span className="muted">Загружаем карты…</span>}>
                {(items) => items.length ? (
                  <div className="trk-cards-list">
                    {items.map((c) => <CardRow key={c.id} card={c} active={c.id === card?.id} onPick={() => setCardId(c.id)} />)}
                  </div>
                ) : <EmptyState icon="card" title="Карты пока нет" text="Добавьте карту: деньги будут заморожены до подтверждения урока репетитором." />}
              </QueryView>
              <Button variant="soft" icon="plus" onClick={() => setCardOpen(true)}>Добавить карту</Button>
              {showErrors && problems.card && <span className="trk-error">Добавьте карту, чтобы записаться</span>}
              <Note tone="plain" icon="info">Деньги заморозим при записи и спишем, когда репетитор подтвердит урок. Бесплатная отмена за 4 часа до начала.</Note>
            </>
          )}
          {kind === 'intro' && <Note tone="plain" icon="gift">Знакомство бесплатное, карта не нужна. Оно доступно один раз для каждого репетитора.</Note>}
          <div>
            <Checkbox checked={agree} onChange={setAgree}>Согласен(на) с правилами отмены и переноса</Checkbox>
            {showErrors && problems.agree && <span className="trk-error">Подтвердите согласие</span>}
          </div>
          <FormError error={book.error} />
          <Button size="lg" block onClick={submit} loading={book.pending}>{kind === 'intro' ? 'Записаться на знакомство' : 'Записаться'}</Button>
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
