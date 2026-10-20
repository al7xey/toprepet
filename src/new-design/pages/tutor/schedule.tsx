import { useState } from 'react';
import { api } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { ScheduleException, WeekSchedule } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { dateLong } from '../../lib/format';
import { Button, Card, CardTitle, FormError, IconButton, MonthCalendar, OptionChips, PageHeader, QueryView, SelectField, Tabs, WeekEditor, weekProblem, useToast, type DayMark } from '../../ui';

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
  const [windows, setWindows] = useState<{ from: string; to: string }[]>(exception?.intervals.length ? exception.intervals : [{ from: '10:00', to: '14:00' }]);
  const [error, setError] = useState<string | undefined>();
  const save = useMutation(async (item: ScheduleException | null) => { if (item) await api.saveException(item); else await api.deleteException(date); return true; });
  const usual = week.days.find((d) => d.weekday === weekdayOf(date))?.intervals ?? [];
  const usualText = usual.length ? usual.map((i) => `${i.from}–${i.to}`).join(', ') : 'нет времени';

  const apply = async () => {
    setError(undefined);
    const hourOf = (v: string) => Number(v.slice(0, 2));
    const sorted = [...windows].sort((a, b) => hourOf(a.from) - hourOf(b.from));
    if (kind === 'extra') {
      if (sorted.some((w) => hourOf(w.from) >= hourOf(w.to))) { setError('Время «до» должно быть позже «с»'); return; }
      if (sorted.some((w, i) => i > 0 && hourOf(w.from) < hourOf(sorted[i - 1].to))) { setError('Окошки не должны пересекаться'); return; }
    }
    const item: ScheduleException | null = kind === 'normal' ? null : { date, kind, intervals: kind === 'extra' ? sorted : [] };
    if (await save.run(item)) { toast(kind === 'normal' ? 'День снова по расписанию' : 'Сохранено'); onChanged(); }
  };

  return (
    <div className="trk-form">
      <CardTitle>{dateLong(`${date}T12:00:00`)}</CardTitle>
      <p className="cap">По расписанию в этот день: {usualText}.</p>
      <OptionChips options={DAY_KINDS} value={kind} onChange={setKind} />
      {kind === 'extra' && (
        <div className="trk-form">
          {windows.map((w, i) => (
            <div className="trk-two trk-window" key={i}>
              <SelectField label="С" value={w.from} onChange={(e) => setWindows(windows.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} options={HOURS} />
              <SelectField label="До" value={w.to} onChange={(e) => setWindows(windows.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} options={HOURS} error={i === windows.length - 1 ? error : undefined} />
              {windows.length > 1 && <IconButton icon="x" label={`Убрать окошко ${i + 1}`} onClick={() => setWindows(windows.filter((_, j) => j !== i))} />}
            </div>
          ))}
          <div><IconButton icon="plus" label="Добавить окошко" className="trk-addbtn" onClick={() => { const last = windows[windows.length - 1]; const h = Math.min(21, Number(last.to.slice(0, 2))); setWindows([...windows, { from: `${String(h).padStart(2, '0')}:00`, to: `${String(Math.min(23, h + 2)).padStart(2, '0')}:00` }]); }} /></div>
        </div>
      )}
      <FormError error={save.error} />
      <Button size="lg" block onClick={apply} loading={save.pending}>Сохранить</Button>
    </div>
  );
}
