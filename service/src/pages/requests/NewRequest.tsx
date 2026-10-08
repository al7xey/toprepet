import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Btn, Checks, Empty, Field, Note, Option, Options, StepsBar, TextField, Textarea, Timeline, Tz } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, requests as rq, catalog, tutors as tApi } from '../../api';
import type { LessonRequest } from '../../api/types';
import { fmtMoney, studentPrice } from '../../lib/money';
import { nb } from '../../lib/text';
import { utcLabel, zoneCity } from '../../lib/time';
import { RequestCard } from './RequestCard';

type Draft = rq.RequestDraft;
const DRAFT_KEY = 'toprepet.service.requestDraft';

const emptyDraft = (): Draft => ({ direction: '', subject: '', level: '', goal: '', forChild: false, childAge: '', format: 'online', budget: 2500, times: [], frequency: '' });

function loadDraft(userId: string): Draft | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}.${userId}`);
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export default function NewRequest() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const editing = id ? d.requests.find(r => r.id === id && r.studentId === me.id) : undefined;
  const [draft, setDraft] = useState<Draft>(() => {
    if (editing) {
      const { direction, subject, level, goal, forChild, childAge, format, budget, times, frequency } = editing;
      return { direction, subject, level, goal, forChild, childAge: childAge ?? '', format, budget, times, frequency };
    }
    const saved = loadDraft(me.id);
    if (saved && !sp.get('subject')) return saved;
    const ob = me.onboarding;
    const obDir = catalog.DIRECTIONS.find(x => x.title === ob?.goal || x.id === ob?.goal)?.title;
    const subject = sp.get('subject') ?? ob?.subject ?? '';
    const dir = catalog.directionById(sp.get('dir'))?.title ?? obDir ?? (subject ? catalog.DIRECTIONS.find(x => x.subjects.includes(subject))?.title : undefined) ?? '';
    return { ...emptyDraft(), direction: dir, subject, goal: sp.get('goal') ?? '', forChild: ob?.forWhom === 'other' };
  });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tried, setTried] = useState(0);
  useEffect(() => window.scrollTo({ top: 0 }), [step]);
  const set = (p: Partial<Draft>) => setDraft(x => ({ ...x, ...p }));
  const errors = useMemo(() => (tried ? rq.validateRequest(draft, tried as 1 | 2) : {}), [draft, tried]);

  if (id && !editing) return <Page title="Заявка" back="/my/requests"><Empty icon="doc" title="Заявка не найдена" action={<Btn to="/my/requests">Мои заявки</Btn>} /></Page>;

  const dir = catalog.DIRECTIONS.find(x => x.title === draft.direction);
  const subjects = dir ? dir.subjects : catalog.SUBJECTS.slice(0, 12);
  const levels = draft.subject && catalog.isLanguage(draft.subject) ? catalog.LANGUAGE_LEVELS : catalog.LEVELS;
  const avg = (() => {
    const ps = d.tutors.filter(t => tApi.isListed(t)).flatMap(t => t.prices.filter(p => p.subject === draft.subject && p.minutes === 60).map(p => studentPrice(p.price)));
    return ps.length ? Math.round(ps.reduce((s, x) => s + x, 0) / ps.length / 50) * 50 : 0;
  })();
  const subjShort = draft.subject.replace(/ язык$/, '');
  const budgetLabel = catalog.BUDGETS.find(b => b.value === draft.budget)?.label ?? rq.fmtBudget(draft.budget);
  const timesLabel = rq.fmtTimes(draft.times);
  const saveDraft = () => {
    try { localStorage.setItem(`${DRAFT_KEY}.${me.id}`, JSON.stringify(draft)); } catch { /* storage may be unavailable */ }
    toast('Черновик сохранён', { tone: 'ok' });
  };
  const next = () => {
    const need = step as 1 | 2;
    const e = rq.validateRequest(draft, need);
    setTried(need);
    if (Object.keys(e).length) {
      toast(Object.values(e)[0], { tone: 'bad' });
      return;
    }
    setTried(0);
    setStep((step + 1) as 2 | 3);
  };
  const back = () => (step === 1 ? navigate('/my/requests') : setStep((step - 1) as 1 | 2));
  const publish = () => {
    const r = run(() => rq.publishRequest({ ...draft, childAge: draft.forChild ? draft.childAge : undefined }, editing?.id));
    if (!r) return;
    try { localStorage.removeItem(`${DRAFT_KEY}.${me.id}`); } catch { /* ignore */ }
    toast(editing ? 'Заявка обновлена' : 'Заявка опубликована на 14 дней. Подходящие репетиторы уже получили уведомление', { tone: 'ok' });
    navigate(`/my/requests`);
  };

  const capt = (
    <>
      <div className="r5-capt"><span>{`Шаг ${step} из 3`}</span>{!editing && step < 3 && <Btn size="s" onClick={saveDraft}>Сохранить черновик</Btn>}</div>
      <StepsBar n={step} of={3} />
    </>
  );

  const step1 = (
    <>
      <Options className="" options={catalog.DIRECTIONS.map(x => ({ value: x.title, label: x.title }))} value={draft.direction} onChange={v => set({ direction: v, subject: catalog.DIRECTIONS.find(x => x.title === v)?.subjects.includes(draft.subject) ? draft.subject : '' })} error={errors.direction} />
      <div className="r5-sec"><div className="h3">Предмет</div><Options options={subjects} value={draft.subject} onChange={v => set({ subject: v, level: '' })} error={errors.subject} /></div>
      <div className="r5-sec"><div className="h3">Уровень</div><Options options={levels} value={draft.level} onChange={v => set({ level: v })} error={errors.level} /></div>
      <Field label="Чего хотите добиться" help="Репетиторы увидят это в заявке" error={errors.goal} style={{ maxWidth: 'none' }}>
        <Textarea className="r5-ta r5-ta-s" aria-label="Чего хотите добиться" value={draft.goal} maxLength={300} placeholder="Например: через месяц собеседование на английском" invalid={!!errors.goal} onChange={e => set({ goal: e.target.value })} />
      </Field>
      <div className="r5-sec">
        <fieldset className="options"><Option type="checkbox" checked={draft.forChild} onChange={() => set({ forChild: !draft.forChild })}>Ищу для ребёнка</Option></fieldset>
        {draft.forChild ? <TextField label="Класс или возраст" value={draft.childAge ?? ''} onChange={v => set({ childAge: v })} placeholder="Например, 7 класс" error={errors.childAge} /> : <span className="help">Отметьте, и мы спросим класс или возраст</span>}
      </div>
    </>
  );
  const step2 = (
    <>
      <div className="r5-sec"><div className="h3">Формат</div><Options options={[{ value: 'online', label: 'Онлайн' }, { value: 'offline', label: 'Очно' }]} value={draft.format} onChange={v => set({ format: v as LessonRequest['format'] })} error={errors.format} /></div>
      <div className="r5-sec">
        <div className="h3">Бюджет за 60 минут</div>
        <Options options={catalog.BUDGETS.map(b => ({ value: String(b.value), label: b.label }))} value={String(draft.budget)} onChange={v => set({ budget: v === 'null' ? null : Number(v) })} />
        {avg > 0 && <Note className="r5-pn">{`Средняя цена по предмету «${subjShort.toLowerCase()}» — ${fmtMoney(avg)}`}</Note>}
      </div>
      <div className="r5-sec">
        <div className="h3">Удобное время</div>
        <Checks options={catalog.TIME_BUCKETS.map(b => ({ value: b.id, label: b.label }))} value={draft.times} onChange={v => set({ times: v })} error={errors.times} />
        <Tz>{`Время ваше, ${zoneCity(me.tz)} (${utcLabel(me.tz)})`}</Tz>
      </div>
      <div className="r5-sec"><div className="h3">Как часто</div><Options options={catalog.FREQUENCIES} value={draft.frequency} onChange={v => set({ frequency: v })} error={errors.frequency} /></div>
    </>
  );
  const preview: LessonRequest = { ...draft, id: 'preview', slug: '', studentId: me.id, title: rq.requestTitle(draft), status: 'draft', createdAt: Date.now(), responseLimit: 10 };
  const nextSteps = (
    <Timeline flat items={[
      { state: 'cur', icon: 'send', title: 'Подходящие репетиторы получат уведомление', text: 'По предмету, цене и свободному времени' },
      { state: 'todo', icon: 'chat', title: 'Отклики придут в «Мои заявки» и чат', text: 'В каждом — цена, сообщение и 3–5 окон' },
      { state: 'todo', icon: 'clock', title: 'Заявка открыта 14 дней', text: 'Не больше 10 откликов, потом можно продлить' },
    ]} />
  );
  const step3 = (
    <>
      <RequestCard r={preview} showLevel footRight={<span>откликов 0 из 10</span>} />
      <Note className="r5-pn" icon="shield">Почта и телефон в заявке не показываются. Репетиторы пишут вам в чате TopRepet.</Note>
    </>
  );
  const heading = step === 1 ? 'Какая помощь нужна?' : step === 2 ? 'Когда и за сколько' : editing ? 'Так заявка выглядит сейчас' : 'Так заявку увидят репетиторы';
  const rows: [string, string][] = step === 1
    ? [['Направление', draft.direction || 'Не выбрано'], ['Предмет', subjShort || 'Не выбран'], ['Уровень', draft.level || 'Не выбран'], ['Бюджет', 'Не выбран'], ['Время', 'Не выбрано']]
    : [['Направление', draft.direction], ['Предмет', `${subjShort}${draft.level ? `, ${draft.level}` : ''}`], ['Формат', draft.format === 'online' ? 'Онлайн' : 'Очно'], ['Бюджет', budgetLabel], ['Время', timesLabel ? timesLabel[0].toUpperCase() + timesLabel.slice(1) : 'Не выбрано'], ['Частота', draft.frequency || 'Не выбрана']];
  const publishLabel = editing ? 'Сохранить изменения' : 'Опубликовать';

  if (phone) {
    const sum = step < 3 && (
      <div className="card"><div className="h3">Ваша заявка</div>
        <dl className="kv r5-kvr">{(step === 1 ? rows.slice(0, 2) : rows.slice(2)).filter(([, v]) => !/^Не /.test(v)).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{nb(v)}</dd></div>)}</dl>
      </div>
    );
    const bar = step === 1
      ? <ActionBar><Btn v="primary" onClick={next}>Далее</Btn></ActionBar>
      : step === 2
        ? <ActionBar><Btn onClick={back}>Назад</Btn><Btn v="primary" onClick={next}>Далее</Btn></ActionBar>
        : <ActionBar><Btn onClick={() => setStep(1)}>Изменить</Btn><Btn v="primary" onClick={publish}>{publishLabel}</Btn></ActionBar>;
    return (
      <Page title={editing ? 'Изменить заявку' : 'Новая заявка'} back="/my/requests" onBack={step > 1 ? back : undefined} mTitle={editing ? 'Изменить заявку' : 'Новая заявка'} bottom={bar} className="r5">
        {capt}
        <h1 className="h1">{heading}</h1>
        {step === 1 ? step1 : step === 2 ? step2 : step3}
        {sum}
        {step === 3 && <div className="card" style={{ gap: 14 }}><div className="h3">Что будет дальше</div>{nextSteps}</div>}
      </Page>
    );
  }
  return (
    <Page title={editing ? 'Изменить заявку' : 'Новая заявка'} className="r5">
      <div className="cols c2">
        <div className="pg" style={{ padding: 0, gap: 22 }}>
          {capt}
          <h1 className="h1">{heading}</h1>
          {step === 1 ? step1 : step === 2 ? step2 : step3}
        </div>
        {step < 3 ? (
          <aside className="summary r5-stick" style={{ maxWidth: 'none' }}>
            <h4>Ваша заявка</h4>
            <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd style={/^Не /.test(v) ? { color: 'var(--muted)', fontWeight: 600 } : undefined}>{nb(v)}</dd></div>)}</dl>
            <div style={{ display: 'grid', gap: 8 }}>
              <Btn v="primary" block onClick={next}>Далее</Btn>
              {step === 2 ? <Btn block onClick={back}>Назад</Btn> : <Btn block to="/my/requests">Отмена</Btn>}
            </div>
          </aside>
        ) : (
          <div className="r5-stick" style={{ display: 'grid', gap: 14 }}>
            <div className="card" style={{ gap: 14 }}>
              <div className="h3">Что будет дальше</div>
              {nextSteps}
              <Btn v="primary" block onClick={publish}>{editing ? publishLabel : 'Опубликовать на 14 дней'}</Btn>
              <Btn block onClick={() => setStep(1)}>Изменить</Btn>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
