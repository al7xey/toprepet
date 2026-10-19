import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjects as allSubjects } from '../../../entities/lesson';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, Card, FormError, OptionChips, PageHeader, SelectField, TextArea, WizardProgress, useToast } from '../../ui';

const SUBJECTS = allSubjects.filter((s) => s !== 'Другой предмет');
const LEVELS = ['Дошкольник', '1–4 класс', '5–9 класс', '10–11 класс', 'Студент', 'Взрослый'];
const GOALS = ['Подтянуть школьную программу', 'Подготовка к ОГЭ или ЕГЭ', 'Домашние задания', 'Разговорная практика', 'Работа и карьера', 'Другое'];
const SCHEDULE = ['Будни утром', 'Будни днём', 'Будни вечером', 'Выходные'];
const BUDGETS = [{ value: '1500', label: 'до 1 500 ₽' }, { value: '2000', label: 'до 2 000 ₽' }, { value: '2500', label: 'до 2 500 ₽' }, { value: '0', label: 'Не важно' }];

/** Новая заявка: два шага. Репетиторы увидят её и откликнутся сами. */
export default function NewRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState<string>(SUBJECTS[0] ?? '');
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation((input: Parameters<typeof api.createRequest>[0]) => api.createRequest(input));

  const check = () => {
    const found: Record<string, string> = {};
    if (step === 1) {
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
    const created = await create.run({ subject, goal: goal ?? '', level, budgetMax: budget && budget !== '0' ? Number(budget) : null, schedule, description: description.trim() });
    if (created) { toast('Заявка опубликована'); void navigate(`/me/requests/${created.id}`, { replace: true }); }
  };

  return (
    <AppLayout role="student" narrow>
      <WizardProgress step={step} total={2} label={`Шаг ${step} из 2 · ${step === 1 ? 'Какая помощь нужна' : 'Подробности'}`} />
      <PageHeader title={step === 1 ? 'Какая помощь нужна' : 'Расскажите подробнее'} />
      <Card>
        <div className="trk-form">
          {step === 1 ? (
            <>
              <SelectField label="Предмет" value={subject} onChange={(e) => setSubject(e.target.value)} options={SUBJECTS} />
              <SelectField label="Кто будет заниматься" value={level} onChange={(e) => setLevel(e.target.value)} options={[{ value: '', label: 'Выберите' }, ...LEVELS]} error={errors.level} />
              <OptionChips options={GOALS} value={goal} onChange={setGoal} label="Цель" />
              {errors.goal && <span className="trk-error">{errors.goal}</span>}
            </>
          ) : (
            <>
              <OptionChips multiple options={SCHEDULE} value={schedule} onChange={setSchedule} label="Удобное время" />
              {errors.schedule && <span className="trk-error">{errors.schedule}</span>}
              <OptionChips options={BUDGETS} value={budget} onChange={setBudget} label="Бюджет за урок" />
              <TextArea label="Что нужно" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} hint="Тема, сроки, что не получается. Телефоны и ссылки писать нельзя." />
            </>
          )}
          <FormError error={create.error} />
          <div className="trk-actions">
            {step === 2 && <Button variant="fill" onClick={() => setStep(1)}>Назад</Button>}
            <Button onClick={next} loading={create.pending} icon={step === 2 ? 'check' : undefined}>{step === 1 ? 'Дальше' : 'Опубликовать заявку'}</Button>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
