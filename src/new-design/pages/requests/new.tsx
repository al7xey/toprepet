import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjects as allSubjects } from '../../../entities/lesson';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, Card, CardTitle, FormError, OptionChips, PageHeader, PriceRange, TextArea, TextField, WizardProgress, useToast } from '../../ui';

const OTHER = 'Другой предмет';
const SUBJECTS = allSubjects.filter((s) => s !== OTHER);
const LEVELS = ['Дошкольник', '1–4 класс', '5–9 класс', '10–11 класс', 'Студент', 'Взрослый'];
const GOALS = ['Подтянуть школьную программу', 'Подготовка к ОГЭ или ЕГЭ', 'Домашние задания', 'Разговорная практика', 'Работа и карьера', 'Другое'];
const SCHEDULE = ['Будни утром', 'Будни днём', 'Будни вечером', 'Выходные'];
const BUDGET_LIMIT = 10000; // правый край ползунка бюджета: «10 000 ₽ и больше»

/** Новая заявка: два шага. Репетиторы по этим предметам увидят заявку и откликнутся сами. Один мастер для страницы и для окна в профиле. */
export function RequestWizard({ onDone, embedded }: { onDone: (id: string) => void; embedded?: boolean }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [level, setLevel] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [budget, setBudget] = useState<[number, number]>([0, BUDGET_LIMIT]);
  const wrap = useRef<HTMLDivElement>(null);
  const [schedule, setSchedule] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation((input: Parameters<typeof api.createRequest>[0]) => api.createRequest(input));
  const hasOther = picked.includes(OTHER);

  const check = () => {
    const found: Record<string, string> = {};
    if (step === 1) {
      if (!picked.length) found.subjects = 'Выберите хотя бы один предмет';
      if (hasOther && !custom.trim()) found.custom = 'Напишите, какой предмет нужен';
      if (!level) found.level = 'Укажите, кто будет заниматься';
      if (!goal) found.goal = 'Выберите цель';
    } else {
      if (!schedule.length) found.schedule = 'Выберите хотя бы одно удобное время';
      if (!description.trim()) found.description = 'Опишите задачу';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const next = async () => {
    if (!check()) return;
    if (step === 1) { setStep(2); return; }
    const budgetMin = budget[0] > 0 ? budget[0] : null;
    const budgetMax = budget[1] < BUDGET_LIMIT ? budget[1] : null;
    const created = await create.run({
      subjects: picked.filter((s) => s !== OTHER), customSubject: hasOther ? custom.trim() : '',
      goal: goal ?? '', level: level ?? '', budgetMin, budgetMax, schedule, description: description.trim(),
    });
    if (created) { toast('Заявка опубликована'); onDone(created.id); }
  };

  // при переходе между шагами список начинается сверху: и в окне, и на странице
  useEffect(() => {
    wrap.current?.closest('dialog')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [step]);

  return (
    <div ref={wrap} className="trk-wizard">
      <WizardProgress step={step} total={2} />
      {!embedded && <PageHeader title={step === 1 ? 'Какая помощь нужна' : 'Расскажите подробнее'} back={{ to: '/me/requests', label: 'Мои заявки' }} />}
      <div className="trk-account">
        {step === 1 ? (
          <>
            <Card>
              <div className="trk-form">
                <CardTitle>Предметы</CardTitle>
                <OptionChips multiple options={[...SUBJECTS, OTHER]} value={picked} onChange={setPicked} />
                {errors.subjects && <span className="trk-error">{errors.subjects}</span>}
                {hasOther && <TextField label="Какой предмет" value={custom} onChange={(e) => setCustom(e.target.value)} error={errors.custom} placeholder="Например, шахматы" maxLength={120} hint="Заявку со своим предметом увидят все репетиторы" />}
              </div>
            </Card>
            <Card>
              <div className="trk-form">
                <CardTitle>Кто будет заниматься</CardTitle>
                <OptionChips options={LEVELS} value={level} onChange={setLevel} />
                {errors.level && <span className="trk-error">{errors.level}</span>}
              </div>
            </Card>
            <Card>
              <div className="trk-form">
                <CardTitle>Цель</CardTitle>
                <OptionChips options={GOALS} value={goal} onChange={setGoal} />
                {errors.goal && <span className="trk-error">{errors.goal}</span>}
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <div className="trk-form">
                <CardTitle>Удобное время</CardTitle>
                <OptionChips multiple options={SCHEDULE} value={schedule} onChange={setSchedule} />
                {errors.schedule && <span className="trk-error">{errors.schedule}</span>}
              </div>
            </Card>
            <Card>
              <div className="trk-form">
                <CardTitle>Бюджет за урок</CardTitle>
                <PriceRange key={`${budget[0]}-${budget[1]}`} min={budget[0]} max={budget[1]} limit={BUDGET_LIMIT} label="Бюджет" onChange={(lo, hi) => setBudget([lo, hi])} />
              </div>
            </Card>
            <div className="trk-account-wide">
              <Card>
                <div className="trk-form">
                  <CardTitle>Что нужно</CardTitle>
                  <TextArea label="Описание задачи" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} hint="Тема, сроки, что не получается. Телефоны и ссылки писать нельзя." />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
      <FormError error={create.error} />
      <div className="trk-actions">
        {step === 2 && <Button variant="fill" size="lg" onClick={() => setStep(1)}>Назад</Button>}
        <Button size="lg" onClick={next} loading={create.pending}>{step === 1 ? 'Дальше' : 'Опубликовать заявку'}</Button>
      </div>
    </div>
  );
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  return <AppLayout role="student"><RequestWizard onDone={(id) => void navigate(`/me/requests/${id}`, { replace: true })} /></AppLayout>;
}
