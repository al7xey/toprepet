import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjects } from '../../../entities/lesson';
import { api } from '../../api';
import { useMutation } from '../../api/hooks';
import { useSession } from '../../api/session';
import { AuthLayout } from '../../layout/layouts';
import { Button, ChoiceCards, FormError, OptionChips, PageHeader, WizardProgress } from '../../ui';
import { AuthCard } from './shared';

const FOR_WHOM = ['Для себя', 'Для ребёнка'] as const;
const GOALS = ['Подтянуть школьную программу', 'Подготовиться к экзамену', 'Разговорная практика', 'Работа и карьера', 'Другое'];
const SUBJECTS = subjects.filter((s) => s !== 'Другой предмет');

/** Онбординг ученика: три коротких вопроса, чтобы открыть каталог с нужным предметом. Можно пропустить. */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { setUser } = useSession();
  const [step, setStep] = useState(1);
  const [forWhom, setForWhom] = useState<(typeof FOR_WHOM)[number] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const save = useMutation((input: { forWhom: string; subjects: string[]; goal: string }) => api.completeOnboarding(input));

  const finish = async (skip: boolean) => {
    const user = await save.run(skip ? { forWhom: '', subjects: [], goal: '' } : { forWhom: forWhom ?? '', subjects: picked, goal: goal ?? '' });
    if (!user) return;
    setUser(user);
    void navigate(!skip && picked[0] ? `/teachers?subject=${encodeURIComponent(picked[0])}` : '/teachers', { replace: true });
  };

  const titles = ['Для кого занятия?', 'Какие предметы нужны?', 'Какая цель?'];
  const next = () => (step < 3 ? setStep(step + 1) : finish(false));
  const ready = step === 1 ? forWhom !== null : step === 2 ? picked.length > 0 : goal !== null;

  return (
    <AuthLayout>
      <WizardProgress step={step} total={3} />
      <PageHeader title={titles[step - 1]} lead="Это поможет показать подходящих репетиторов. Ответы можно изменить позже." center />
      <AuthCard>
        <div className="trk-form">
          {step === 1 && <ChoiceCards value={forWhom} onChange={setForWhom} label="Для кого занятия" options={FOR_WHOM.map((v) => ({ value: v, title: v, icon: v === 'Для себя' ? 'user' : 'school' }))} />}
          {step === 2 && <OptionChips multiple options={SUBJECTS} value={picked} onChange={setPicked} label="Предметы" />}
          {step === 3 && <OptionChips options={GOALS} value={goal} onChange={setGoal} label="Цель" />}
          <FormError error={save.error} />
          <div className="trk-actions">
            {step > 1 && <Button variant="fill" onClick={() => setStep(step - 1)}>Назад</Button>}
            <Button onClick={next} disabled={!ready} loading={save.pending && step === 3} iconAfter="arrow">{step < 3 ? 'Дальше' : 'Готово'}</Button>
            <Button variant="line" onClick={() => finish(true)} loading={save.pending && step < 3}>Пропустить</Button>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
