import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subjects as allSubjects } from '../../../entities/lesson';
import { api, studentPriceOf } from '../../api';
import { useMutation, useQuery } from '../../api/hooks';
import type { Achievement, TutorProfileDraft, WeekSchedule } from '../../api/types';
import { AppLayout } from '../../layout/layouts';
import { rub } from '../../lib/format';
import { Button, Card, CardTitle, FilePick, FormError, IconButton, OptionChips, PageHeader, QueryView, SelectField, Status, Switch, TextArea, TextField, WeekEditor, WizardProgress, weekIsEmpty, weekProblem, useToast } from '../../ui';

const SUBJECTS = allSubjects.filter((s) => s !== 'Другой предмет');
const LEVELS = ['Дошкольники', '1–4 класс', '5–9 класс', '10–11 класс', 'Взрослые'];
const EXPERIENCE = ['Меньше года', '1–3 года', '3–5 лет', '5–10 лет', 'Больше 10 лет'];
const STEPS = ['О себе', 'Что и как вы преподаёте', 'Сколько стоят занятия', 'Когда вы свободны', 'Документы и публикация'];
const DOC_STATUS = { uploaded: 'Загружен', checking: 'Проверяем', approved: 'Проверен', rejected: 'Отклонён' } as const;

/** Мастер анкеты репетитора: пять шагов, черновик сохраняется на каждом шаге. */
export default function WizardPage() {
  const profile = useQuery('my-profile', () => api.getMyProfile());
  const week = useQuery('my-week', () => api.getWeek());
  return (
    <AppLayout role="tutor" narrow>
      <QueryView query={profile}>
        {(p) => (
          <QueryView query={week}>
            {(w) => <Wizard initial={p} initialWeek={w} />}
          </QueryView>
        )}
      </QueryView>
    </AppLayout>
  );
}

function Wizard({ initial, initialWeek }: { initial: TutorProfileDraft; initialWeek: WeekSchedule }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(initial);
  const [week, setWeek] = useState(initialWeek);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const patch = (value: Partial<TutorProfileDraft>) => setDraft((d) => ({ ...d, ...value }));
  const saveProfile = useMutation((value: TutorProfileDraft) => api.saveMyProfile(value));
  const saveWeek = useMutation((value: WeekSchedule) => api.saveWeek(value));
  const publish = useMutation(() => api.submitMyProfile());
  const photo = useMutation((file: File) => api.uploadPhoto(file));
  const busy = saveProfile.pending || saveWeek.pending;

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (step === 1) {
      if (draft.name.trim().length < 2) found.name = 'Введите имя';
      if (!draft.headline.trim()) found.headline = 'Напишите, чем вы занимаетесь';
      if (draft.about.trim().length < 40) found.about = 'Расскажите о себе подробнее: не меньше 40 символов';
    }
    if (step === 2) {
      if (!draft.subjects.length) found.subjects = 'Выберите хотя бы один предмет';
      if (!draft.levels.length) found.levels = 'Выберите, с кем работаете';
      if (!draft.experience) found.experience = 'Укажите опыт';
    }
    if (step === 3) {
      if (!Number.isInteger(draft.price) || draft.price < 300 || draft.price > 15000) found.price = 'Цена от 300 до 15 000 ₽ за урок';
      if (draft.introMinutes > 0 && (!Number.isInteger(draft.introMinutes) || draft.introMinutes < 5 || draft.introMinutes > 60)) found.introMinutes = 'От 5 до 60 минут';
    }
    if (step === 4) {
      const problem = weekProblem(week);
      if (problem) found.week = problem;
      else if (weekIsEmpty(week)) found.week = 'Откройте хотя бы одно время, иначе записаться будет нельзя';
    }
    return found;
  };

  const next = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    const saved = await saveProfile.run(draft);
    if (!saved) return;
    if (step === 4 && !(await saveWeek.run(week))) return;
    setStep(step + 1);
  };

  const submit = async () => {
    const done = await publish.run();
    if (done) { toast(done.status === 'review' ? 'Анкета отправлена на проверку' : 'Анкета сохранена'); void navigate('/tutor/profile', { replace: true }); }
  };

  return (
    <>
      <WizardProgress step={step} total={STEPS.length} label={`Шаг ${step} из ${STEPS.length} · ${STEPS[step - 1]}`} />
      <PageHeader title={STEPS[step - 1]} />
      <Card>
        <div className="trk-form">
          {step === 1 && (
            <>
              <div className="trk-photo-wrap">
                <div className="trk-photo-big">
                  {draft.photo ? <img src={draft.photo} alt={`Фото: ${draft.name || 'вы'}`} /> : <div className="trk-photo-empty">Фото не загружено</div>}
                </div>
                <FilePick round={draft.photo ? 'edit' : 'add'} icon={draft.photo ? 'edit' : 'plus'} accept="image/*" loading={photo.pending} onPick={async (file) => { const done = await photo.run(file); if (done) patch({ photo: done.url }); }}>{draft.photo ? 'Заменить фото' : 'Загрузить фото'}</FilePick>
              </div>
              <span className="muted sm">Так фото увидят ученики. Лицо крупно, спокойный фон. Подойдёт фото любого размера: мы сами его уменьшим.</span>
              <FormError error={photo.error} />
              <TextField label="Имя" value={draft.name} onChange={(e) => patch({ name: e.target.value })} error={errors.name} autoComplete="given-name" />
              <TextField label="Коротко о вас" value={draft.headline} onChange={(e) => patch({ headline: e.target.value })} error={errors.headline} placeholder="Репетитор по английскому для школьников и взрослых" maxLength={120} />
              <TextArea label="О себе" value={draft.about} onChange={(e) => patch({ about: e.target.value })} error={errors.about} rows={6} hint="Как проходят занятия, чем вы можете помочь ученику" />
            </>
          )}
          {step === 2 && (
            <>
              <OptionChips multiple options={SUBJECTS} value={draft.subjects} onChange={(v) => patch({ subjects: v })} label="Предметы" />
              {errors.subjects && <span className="trk-error">{errors.subjects}</span>}
              <OptionChips multiple options={LEVELS} value={draft.levels} onChange={(v) => patch({ levels: v })} label="С кем работаете" />
              {errors.levels && <span className="trk-error">{errors.levels}</span>}
              <SelectField label="Опыт преподавания" value={draft.experience} onChange={(e) => patch({ experience: e.target.value })} options={[{ value: '', label: 'Выберите' }, ...EXPERIENCE]} error={errors.experience} />
              <TextArea label="Подход к занятиям" value={draft.approach} onChange={(e) => patch({ approach: e.target.value })} rows={4} hint="Необязательно" />
              <Education value={draft.education} onChange={(education) => patch({ education })} />
            </>
          )}
          {step === 3 && (
            <>
              <TextField label="Цена за урок, ₽" type="number" inputMode="numeric" min={300} max={15000} step={50} value={draft.price || ''} onChange={(e) => patch({ price: Number(e.target.value) })} error={errors.price} hint={draft.price ? `Ученики увидят ${rub(studentPriceOf(draft.price))}. Вы получите ${rub(draft.price)} за каждый урок целиком` : 'Урок длится 60 минут'} />
              <Switch checked={draft.introMinutes > 0} onChange={(on) => patch({ introMinutes: on ? 20 : 0 })} title="Бесплатное знакомство" text="Один раз на ученика, без оплаты. Анкеты со знакомством выбирают чаще." />
              {draft.introMinutes > 0 && <TextField label="Длительность знакомства, минут" type="number" inputMode="numeric" min={5} max={60} step={5} value={draft.introMinutes || ''} onChange={(e) => patch({ introMinutes: Number(e.target.value) })} error={errors.introMinutes} hint="От 5 до 60 минут" />}
            </>
          )}
          {step === 4 && (
            <>
              <p className="cap">Отметьте, когда готовы вести уроки. Ученики записываются на целые часы, время московское.</p>
              <WeekEditor value={week} onChange={setWeek} />
              {errors.week && <span className="trk-error">{errors.week}</span>}
            </>
          )}
          {step === 5 && <Finish draft={draft} week={week} />}
          <FormError error={saveProfile.error ?? saveWeek.error ?? publish.error} />
          <div className="trk-actions">
            {step > 1 && <Button variant="fill" onClick={() => setStep(step - 1)}>Назад</Button>}
            {step < STEPS.length
              ? <Button onClick={next} loading={busy}>Дальше</Button>
              : <Button onClick={submit} loading={publish.pending} icon="check">Отправить на проверку</Button>}
          </div>
        </div>
      </Card>
    </>
  );
}

function Education({ value, onChange }: { value: Achievement[]; onChange: (v: Achievement[]) => void }) {
  const set = (i: number, part: Partial<Achievement>) => onChange(value.map((x, j) => (j === i ? { ...x, ...part } : x)));
  return (
    <div className="g12">
      <CardTitle>Образование и достижения</CardTitle>
      {value.map((a, i) => (
        <div className="trk-edu" key={i}>
          <TextField label="Название" value={a.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Бакалавр, МГУ, 2022" />
          <TextField label="Пояснение" value={a.text} onChange={(e) => set(i, { text: e.target.value })} />
          <Button size="s" variant="fill" onClick={() => onChange(value.filter((_, j) => j !== i))}>Убрать</Button>
        </div>
      ))}
      {value.length < 5 && <IconButton icon="plus" label="Добавить достижение" onClick={() => onChange([...value, { title: '', text: '' }])} className="trk-addbtn" />}
    </div>
  );
}

/** Последний шаг: документы и сводка перед публикацией. */
function Finish({ draft, week }: { draft: TutorProfileDraft; week: WeekSchedule }) {
  const toast = useToast();
  const docs = useQuery('my-documents', () => api.listDocuments());
  const upload = useMutation((file: File) => api.uploadDocument(file.name.replace(/\.[^.]+$/, ''), file));
  const checks: [string, boolean][] = [
    ['Фото и описание', Boolean(draft.photo) && draft.about.trim().length >= 40],
    ['Предметы и опыт', draft.subjects.length > 0 && Boolean(draft.experience)],
    ['Цена', draft.price > 0],
    ['Время для записи', !weekIsEmpty(week)],
  ];
  return (
    <>
      <section className="trk-docs">
        <CardTitle>Документы</CardTitle>
        <p className="muted">Диплом или сертификат подтверждают квалификацию: у проверенных анкет появляется метка «Документы проверены». Необязательно.</p>
        {(docs.data ?? []).length > 0 && (
          <ul className="trk-docrows">
            {(docs.data ?? []).map((d) => <li key={d.id}><span>{d.title}</span><Status tone={d.status === 'approved' ? 'ok' : d.status === 'rejected' ? 'bad' : 'wait'}>{DOC_STATUS[d.status]}</Status></li>)}
          </ul>
        )}
        <FormError error={upload.error} />
        <div className="trk-docs-upload">
          <FilePick accept="image/*,application/pdf" loading={upload.pending} onPick={async (file) => { if (await upload.run(file)) { toast('Документ загружен, мы его проверим'); docs.reload(); } }}>Загрузить документ</FilePick>
        </div>
      </section>
      <section className="trk-docs">
        <CardTitle>Перед публикацией</CardTitle>
        <ul className="trk-todo">
          {checks.map(([label, ok]) => <li key={label}><span className={ok ? 'trk-dot' : 'trk-dot off'} aria-hidden="true" /><span>{label}</span><small className="muted">{ok ? 'Заполнено' : 'Нужно заполнить'}</small></li>)}
        </ul>
      </section>
    </>
  );
}
