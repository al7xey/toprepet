import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { ScheduleException, WeekSchedule } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { dateLong } from '../../lib/format';
import { Button, Card, CardTitle, FormError, MonthCalendar, OptionChips, PageHeader, QueryView, SelectField, Tabs, WeekEditor, weekProblem, useToast, type DayMark } from '../../ui';

const HOURS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, '0')}:00`);
type Mode = 'week' | 'dates';
type DayKind = 'normal' | 'off' | 'extra';
const DAY_KINDS: { value: DayKind; label: string }[] = [{ value: 'normal', label: 'Как обычно' }, { value: 'off', label: 'Выходной' }, { value: 'extra', label: 'Другое время' }];
const weekdayOf = (key: string) => ((new Date(`${key}T12:00:00`).getDay() + 6) % 7) + 1; // 1 — понедельник

/** Расписание: недельный шаблон, который повторяется каждую неделю, и отдельные даты, где время меняется. */
export default function SchedulePage() {
  const [mode, setMode] = useState<Mode>('week');
  const week = useQuery('my-week', () => api.getWeek());
  const exceptions = useQuery('my-exceptions', () => api.listExceptions());
  return (
    <AppLayout role="tutor">
      <PageHeader title="Расписание" lead="Время московское" back={{ to: '/tutor/account', label: 'Профиль' }} />
      <Tabs<Mode> items={[{ value: 'week', label: 'Каждую неделю' }, { value: 'dates', label: 'По датам' }]} value={mode} onChange={setMode} />
      <QueryView query={week}>
        {(saved) => mode === 'week'
          ? <WeekPanel saved={saved} onSaved={week.setData} />
          : <DatesPanel week={saved} exceptions={exceptions.data ?? []} onChanged={() => exceptions.reload()} />}
      </QueryView>
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
      <div className="trk-form">
        <p className="cap">Эти часы повторяются каждую неделю. Чтобы изменить отдельный день, откройте вкладку «По датам».</p>
        <WeekEditor value={draft} onChange={setDraft} />
        {problem && <span className="trk-error">{problem}</span>}
        <FormError error={save.error} />
        <div className="trk-actions">
          <Button size="lg" onClick={submit} disabled={!dirty || Boolean(problem)} loading={save.pending}>Сохранить расписание</Button>
          {dirty && <Button size="lg" variant="fill" onClick={() => setDraft(saved)}>Сбросить изменения</Button>}
        </div>
      </div>
    </Card>
  );
}

function DatesPanel({ week, exceptions, onChanged }: { week: WeekSchedule; exceptions: ScheduleException[]; onChanged: () => void }) {
  const [date, setDate] = useState<string | null>(null);
  const byDate = new Map(exceptions.map((x) => [x.date, x]));
  const regular = new Set(week.days.filter((d) => d.intervals.length).map((d) => d.weekday));
  const markOf = (key: string): DayMark | undefined => {
    const x = byDate.get(key);
    if (x) return x.kind === 'off' ? 'off' : 'extra';
    return regular.has(weekdayOf(key)) ? 'regular' : undefined;
  };
  return (
    <div className="trk-account">
      <Card>
        <MonthCalendar value={date} onChange={setDate} markOf={markOf} />
      </Card>
      <Card>
        {date
          ? <DayPanel key={date} date={date} week={week} exception={byDate.get(date)} onChanged={onChanged} />
          : <div className="trk-form"><CardTitle>Выберите дату</CardTitle><p className="cap">Нажмите на день в календаре: можно сделать его выходным или поставить другое время.</p></div>}
      </Card>
    </div>
  );
}

function DayPanel({ date, week, exception, onChanged }: { date: string; week: WeekSchedule; exception: ScheduleException | undefined; onChanged: () => void }) {
  const toast = useToast();
  const [kind, setKind] = useState<DayKind>(exception ? (exception.kind === 'off' ? 'off' : 'extra') : 'normal');
  const [from, setFrom] = useState(exception?.intervals[0]?.from ?? '10:00');
  const [to, setTo] = useState(exception?.intervals[0]?.to ?? '14:00');
  const [error, setError] = useState<string | undefined>();
  const save = useMutation(async (item: ScheduleException | null) => { if (item) await api.saveException(item); else await api.deleteException(date); return true; });
  const usual = week.days.find((d) => d.weekday === weekdayOf(date))?.intervals ?? [];
  const usualText = usual.length ? usual.map((i) => `${i.from}–${i.to}`).join(', ') : 'нет времени';

  const apply = async () => {
    setError(undefined);
    if (kind === 'extra' && Number(from.slice(0, 2)) >= Number(to.slice(0, 2))) { setError('Время «до» должно быть позже «с»'); return; }
    const item: ScheduleException | null = kind === 'normal' ? null : { date, kind, intervals: kind === 'extra' ? [{ from, to }] : [] };
    if (await save.run(item)) { toast(kind === 'normal' ? 'День снова по расписанию' : 'Сохранено'); onChanged(); }
  };

  return (
    <div className="trk-form">
      <CardTitle>{dateLong(`${date}T12:00:00`)}</CardTitle>
      <p className="cap">По расписанию в этот день: {usualText}.</p>
      <OptionChips options={DAY_KINDS} value={kind} onChange={setKind} />
      {kind === 'extra' && (
        <div className="trk-two">
          <SelectField label="С" value={from} onChange={(e) => setFrom(e.target.value)} options={HOURS} />
          <SelectField label="До" value={to} onChange={(e) => setTo(e.target.value)} options={HOURS} error={error} />
        </div>
      )}
      <FormError error={save.error} />
      <Button size="lg" block onClick={apply} loading={save.pending}>Сохранить</Button>
    </div>
  );
}
