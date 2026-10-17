import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { ScheduleException, WeekSchedule } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { dateLong } from '../../lib/format';
import { Button, Card, ChoiceCards, FormError, PageHeader, QueryView, Section, SelectField, TextField, WeekEditor, weekProblem, useToast } from '../../ui';

const HOURS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`);
type Kind = ScheduleException['kind'];

/** Расписание: недельные окна, когда принимаете учеников, и исключения на отдельные даты. */
export default function SchedulePage() {
  const week = useQuery('my-week', () => api.getWeek());
  const exceptions = useQuery('my-exceptions', () => api.listExceptions());
  return (
    <AppLayout role="tutor" narrow>
      <PageHeader title="Расписание" lead="Время московское" />
      <QueryView query={week}>
        {(saved) => <WeekPanel saved={saved} onSaved={week.setData} />}
      </QueryView>
      <Section title="Исключения">
        <p className="cap">Отпуск, выходной или дополнительное время на конкретную дату.</p>
        <ExceptionForm onAdded={() => exceptions.reload()} />
        <QueryView query={exceptions} loading={<span className="muted">Загружаем…</span>}>
          {(items) => items.length === 0 ? <p className="muted">Исключений нет.</p> : (
            <div className="trk-list">
              {items.map((x) => <ExceptionRow key={x.date} item={x} onRemoved={() => exceptions.reload()} />)}
            </div>
          )}
        </QueryView>
      </Section>
    </AppLayout>
  );
}

function WeekPanel({ saved, onSaved }: { saved: WeekSchedule; onSaved: (w: WeekSchedule) => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState(saved);
  const save = useMutation((value: WeekSchedule) => api.saveWeek(value));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const problem = weekProblem(draft);
  const submit = async () => {
    if (problem) return;
    const done = await save.run(draft);
    if (done) { onSaved(done); toast('Расписание сохранено'); }
  };
  return (
    <Card>
      <WeekEditor value={draft} onChange={setDraft} />
      {problem && <span className="trk-error">{problem}</span>}
      <FormError error={save.error} />
      <div className="trk-actions">
        <Button onClick={submit} disabled={!dirty || Boolean(problem)} loading={save.pending}>Сохранить расписание</Button>
        {dirty && <Button variant="fill" onClick={() => setDraft(saved)}>Сбросить изменения</Button>}
      </div>
    </Card>
  );
}

function ExceptionRow({ item, onRemoved }: { item: ScheduleException; onRemoved: () => void }) {
  const toast = useToast();
  const remove = useMutation((date: string) => api.deleteException(date));
  return (
    <Card>
      <div className="trk-exrow">
        <div><b>{dateLong(`${item.date}T12:00:00`)}</b><br /><span className="muted">{item.kind === 'off' ? 'Выходной: запись закрыта' : `Дополнительно: ${item.intervals.map((i) => `${i.from}–${i.to}`).join(', ')}`}</span></div>
        <Button size="s" variant="fill" loading={remove.pending} onClick={async () => { if (await remove.run(item.date)) { toast('Исключение удалено'); onRemoved(); } }}>Удалить</Button>
      </div>
      <FormError error={remove.error} />
    </Card>
  );
}

function ExceptionForm({ onAdded }: { onAdded: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<Kind>('off');
  const [from, setFrom] = useState('10:00');
  const [to, setTo] = useState('14:00');
  const [error, setError] = useState<string | undefined>();
  const add = useMutation((item: ScheduleException) => api.saveException(item));
  const submit = async () => {
    if (!date || date < today) { setError('Выберите дату не раньше сегодняшней'); return; }
    if (kind === 'extra' && Number(from.slice(0, 2)) >= Number(to.slice(0, 2))) { setError('Время «до» должно быть позже «с»'); return; }
    setError(undefined);
    if (await add.run({ date, kind, intervals: kind === 'extra' ? [{ from, to }] : [] })) { toast('Исключение добавлено'); onAdded(); }
  };
  return (
    <Card>
      <div className="trk-form">
        <ChoiceCards<Kind> value={kind} onChange={setKind} columns={2} label="Тип исключения" options={[{ value: 'off', title: 'Выходной', text: 'В этот день записи нет', icon: 'pause' }, { value: 'extra', title: 'Дополнительное время', text: 'Откроем окно сверх расписания', icon: 'plus' }]} />
        <TextField label="Дата" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} error={error} />
        {kind === 'extra' && <div className="trk-two"><SelectField label="С" value={from} onChange={(e) => setFrom(e.target.value)} options={HOURS} /><SelectField label="До" value={to} onChange={(e) => setTo(e.target.value)} options={HOURS} /></div>}
        <FormError error={add.error} />
        <div className="trk-actions"><Button onClick={submit} loading={add.pending} icon="plus">Добавить</Button></div>
      </div>
    </Card>
  );
}
