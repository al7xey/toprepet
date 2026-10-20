import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjects as allSubjects } from '../../../entities/lesson';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { AppLayout } from '../../layout/layouts';
import { Button, Card, CardTitle, FormError, OptionChips, PageHeader, TextArea, TextField, WizardProgress, useToast } from '../../ui';

const OTHER = 'Другой предмет';
const SUBJECTS = allSubjects.filter((s) => s !== OTHER);
const LEVELS = ['Дошкольник', '1–4 класс', '5–9 класс', '10–11 класс', 'Студент', 'Взрослый'];
const GOALS = ['Подтянуть школьную программу', 'Подготовка к ОГЭ или ЕГЭ', 'Домашние задания', 'Разговорная практика', 'Работа и карьера', 'Другое'];
const SCHEDULE = ['Будни утром', 'Будни днём', 'Будни вечером', 'Выходные'];
const CUSTOM = 'custom';
const BUDGETS = [
  { value: '1000', label: 'до 1 000 ₽' }, { value: '1500', label: 'до 1 500 ₽' }, { value: '2000', label: 'до 2 000 ₽' }, { value: '2500', label: 'до 2 500 ₽' },
  { value: '0', label: 'Не важно' }, { value: CUSTOM, label: 'Своя цена' },
];

/** Новая заявка: два шага. Репетиторы по этим предметам увидят заявку и откликнутся сами. Один мастер для страницы и для окна в профиле. */
export function RequestWizard({ onDone, embedded }: { onDone: (id: string) => void; embedded?: boolean }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [level, setLevel] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [ownPrice, setOwnPrice] = useState('');
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
      if (budget === CUSTOM) {
        const value = Number(ownPrice);
        if (!Number.isInteger(value) || value < 100 || value > 50000) found.price = 'Цена от 100 до 50 000 ₽ за урок';
      }
      if (!description.trim()) found.description = 'Опишите задачу';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const next = async () => {
    if (!check()) return;
    if (step === 1) { setStep(2); return; }
    const budgetMax = budget === CUSTOM ? Number(ownPrice) : budget && budget !== '0' ? Number(budget) : null;
    const created = await create.run({
      subjects: picked.filter((s) => s !== OTHER), customSubject: hasOther ? custom.trim() : '',
      goal: goal ?? '', level: level ?? '', budgetMax, schedule, description: description.trim(),
    });
    if (created) { toast('Заявка опубликована'); onDone(created.id); }
  };

  return (
    <>
      <WizardProgress step={step} total={2} label={`Шаг ${step} из 2 · ${step === 1 ? 'Какая помощь нужна' : 'Подробности'}`} />
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
                <OptionChips options={BUDGETS} value={budget} onChange={setBudget} />
                {budget === CUSTOM && <TextField label="Не больше, ₽ за урок" type="number" inputMode="numeric" min={100} max={50000} step={50} value={ownPrice} onChange={(e) => setOwnPrice(e.target.value)} error={errors.price} />}
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
    </>
  );
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  return <AppLayout role="student"><RequestWizard onDone={(id) => void navigate(`/me/requests/${id}`, { replace: true })} /></AppLayout>;
}
