import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ActionBar, Page } from '../../ui/layout';
import { Alert, Ava, Btn, Checks, Chip, Dropdown, Field, IBtn, Input, MenuItem, Note, Options, Seg, Switch, Textarea, Tz, cx } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, catalog, schedule, tutors as tApi, tutorById } from '../../api';
import type { PriceItem, StudentCategory, TutorProfile } from '../../api/types';
import { fmtMoney, parseMoney, serviceFee, studentPrice } from '../../lib/money';
import { nb, uid } from '../../lib/text';
import { NB, utcLabel, zoneCity } from '../../lib/time';
import { DAYS, PrevCard, ReqList, SavedMark, WeekGrid, resizeImage } from './shared';

const STEP_NAMES = ['О себе', 'Направления', 'Цены', 'Расписание'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const REQ = <span className="r2-req" aria-label="обязательно">*</span>;

/* text fields are edited locally and saved shortly after typing stops */
function useAutosave(t: TutorProfile) {
  const [text, setText] = useState({ name: t.name, about: t.about, education: t.education, experienceText: t.experienceText });
  const timer = useRef<number>(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => tApi.saveTutor(text), 500);
    return () => window.clearTimeout(timer.current);
  }, [text]);
  useEffect(() => () => { window.clearTimeout(timer.current); }, []);
  return [text, (p: Partial<typeof text>) => setText(x => ({ ...x, ...p })), () => { window.clearTimeout(timer.current); tApi.saveTutor(text); }] as const;
}

export default function Wizard() {
  const d = useDb();
  const me = useSession()!;
  const t = tutorById(d, me.id);
  if (!t) return <Navigate to="/tutor/lessons" replace />;
  return <WizardInner t={t} />;
}

function WizardInner({ t }: { t: TutorProfile }) {
  const [sp, setSp] = useSearchParams();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run, toast } = useApp();
  const step = Math.min(4, Math.max(1, Number(sp.get('step')) || 1));
  const go = (n: number) => { flush(); setSp({ step: String(n) }); window.scrollTo({ top: 0 }); };
  const [text, setText, flush] = useAutosave(t);
  const [q, setQ] = useState('');
  const [addMenu, setAddMenu] = useState(false);
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const save = (changes: tApi.TutorEditable) => run(() => tApi.saveTutor(changes));

  /* ---------- step 1 ---------- */
  const pickPhoto = async (f?: File) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return toast('Фото больше 20 МБ', { tone: 'bad' });
    try {
      const url = await resizeImage(f);
      save({ photo: url });
      toast('Фото загружено', { tone: 'ok' });
    } catch (e) {
      toast((e as Error).message, { tone: 'bad' });
    }
  };
  const step1 = (
    <div className="r2-form">
      <div className="r2-photo">
        {t.photo ? <Ava tone={t.tone} src={t.photo} /> : <span className="r2-nophoto"><Icon name="user" /></span>}
        <div>
          <b>Фото {REQ}</b>
          <div className="row-s"><Btn size="s" icon="plus" onClick={() => fileRef.current?.click()}>{t.photo ? 'Заменить фото' : 'Загрузить фото'}</Btn>{t.photo && <Btn size="s" v="white" onClick={() => save({ photo: undefined })}>Убрать</Btn>}</div>
          <span className="small">Лицо крупно, светлый фон</span>
          <input ref={fileRef} className="file-input" type="file" accept="image/*" onChange={e => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>
      <Field label={<>Имя и фамилия {REQ}</>} htmlFor="w-name" error={!text.name.trim() ? 'Укажите имя' : undefined}>
        <Input id="w-name" value={text.name} onChange={e => setText({ name: e.target.value })} onBlur={flush} autoComplete="name" />
      </Field>
      <Field label="О себе" htmlFor="w-about" help={text.about.trim().length < 120 ? `Подробное «О себе» повышает шансы. Ещё ${120 - text.about.trim().length} символов до хорошего описания` : 'Отлично, ученикам будет понятно, чем вы поможете'} counter={`${text.about.length} / 1500`}>
        <Textarea id="w-about" rows={4} maxLength={1500} value={text.about} onChange={e => setText({ about: e.target.value })} onBlur={flush} placeholder="С кем занимаетесь, какие результаты у учеников, как строите уроки" />
      </Field>
      <Field label="Образование" htmlFor="w-edu"><Textarea id="w-edu" className="r2-ta" rows={2} value={text.education} onChange={e => setText({ education: e.target.value })} onBlur={flush} placeholder="Вуз, факультет, год" /></Field>
      <Field label="Опыт и достижения" htmlFor="w-exp"><Textarea id="w-exp" className="r2-ta" rows={2} value={text.experienceText} onChange={e => setText({ experienceText: e.target.value })} onBlur={flush} placeholder="Сертификаты, результаты учеников" /></Field>
      <Options legend={<span className="r2-lbl">Стаж преподавания</span>} options={[{ value: '0', label: 'Меньше года' }, { value: '1', label: '1–3 года' }, { value: '3', label: '3–5 лет' }, { value: '5', label: '5–10 лет' }, { value: '10', label: 'Больше 10 лет' }]} value={String(t.experienceYears >= 10 ? 10 : t.experienceYears >= 5 ? 5 : t.experienceYears >= 3 ? 3 : t.experienceYears >= 1 ? 1 : 0)} onChange={v => save({ experienceYears: Number(v) })} />
    </div>
  );
  const docsAlert = !t.docs.length && <Alert tone="action" icon="shield" title="Добавьте документы" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to="/tutor/profile/documents">Добавить</Btn>}>{`Анкеты со значком «Документы проверены» выбирают в${NB}2${NB}раза чаще.`}</Alert>;

  /* ---------- step 2 ---------- */
  const found = q.trim() ? catalog.SUBJECTS.filter(s => s.toLowerCase().includes(q.trim().toLowerCase()) && !t.subjects.some(x => x.subject === s)).slice(0, 6) : [];
  const addSubject = (s: string) => {
    if (!s || t.subjects.some(x => x.subject === s)) return;
    save({ subjects: [...t.subjects, { subject: s, goals: [], students: [] }] });
    setQ('');
  };
  const setSubj = (i: number, p: Partial<TutorProfile['subjects'][number]>) => save({ subjects: t.subjects.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const subjectCards = t.subjects.map((s, i) => (
    <div className="card" key={s.subject}>
      <div className="r2-subj-h"><b className="h3">{s.subject}</b><Btn size="s" onClick={() => save({ subjects: t.subjects.filter((_, k) => k !== i) })}>Убрать</Btn></div>
      <span className="r2-lbl">Цели</span>
      <div className="r2-chips">{catalog.goalsFor(s.subject).map(g => <Chip key={g} pressed={s.goals.includes(g)} onClick={() => setSubj(i, { goals: toggle(s.goals, g) })}>{g}</Chip>)}</div>
      <span className="r2-lbl">Ученики</span>
      <div className="r2-chips">{catalog.STUDENT_CATEGORIES.map(c => <Chip key={c} pressed={s.students.includes(c)} onClick={() => setSubj(i, { students: toggle<StudentCategory>(s.students, c) })}>{c}</Chip>)}</div>
    </div>
  ));
  const search = (
    <div className="filter" style={{ display: 'grid', gap: 8 }}>
      <div className={cx('row', !phone && 'r2-srow')} style={{ gap: 8 }}>
        <label className="search" style={{ maxWidth: 'none', background: 'var(--fill)', boxShadow: 'none' }}><Icon name="search" /><input placeholder={phone ? 'Найти предмет' : 'Найти предмет: английский, Python, гитара…'} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && found[0] && addSubject(found[0])} aria-label="Найти предмет" /></label>
        {!phone && <Btn icon="plus" onClick={() => (found[0] ? addSubject(found[0]) : setQ(q || ' '))}>Добавить предмет</Btn>}
      </div>
      {found.length > 0 && <div className="r2-chips">{found.map(s => <Chip key={s} icon="plus" onClick={() => addSubject(s)}>{s}</Chip>)}</div>}
      {q.trim() && !found.length && <span className="small">Такого предмета нет в справочнике. Напишите в поддержку, добавим.</span>}
    </div>
  );
  const formats = (
    <div className="card r2-cmp">
      <span className="r2-lbl">Формат занятий</span>
      <Checks options={[{ value: 'online', label: 'Онлайн' }, { value: 'atHome', label: 'У себя' }, { value: 'atStudent', label: 'У ученика' }]} value={(['online', 'atHome', 'atStudent'] as const).filter(k => t.formats[k])} onChange={v => save({ formats: { ...t.formats, online: v.includes('online'), atHome: v.includes('atHome'), atStudent: v.includes('atStudent') } })} />
      {(t.formats.atHome || t.formats.atStudent) && <Field label="Район или метро" htmlFor="w-district" style={{ maxWidth: 'none' }}><Input id="w-district" defaultValue={t.formats.district} onBlur={e => save({ formats: { ...t.formats, district: e.target.value } })} placeholder="Например, Пресненский, м. Баррикадная" /></Field>}
      {t.formats.online && <><span className="r2-lbl" style={{ marginTop: 6 }}>Где проводите онлайн-уроки</span><Checks options={catalog.ONLINE_SERVICES} value={t.services} onChange={v => save({ services: v })} /></>}
      <Note icon="video">Ссылку на звонок вы добавите к каждому уроку. В анкете её нет.</Note>
    </div>
  );
  const intro = (
    <div className="card r2-cmp">
      <label className="between" style={{ cursor: 'pointer' }}><span><b className="h3">Бесплатное знакомство</b><span className="small" style={{ display: 'block' }}>С ним вас выбирают чаще</span></span><Switch checked={t.intro.enabled} onChange={v => save({ intro: { ...t.intro, enabled: v } })} label="Бесплатное знакомство" /></label>
      {t.intro.enabled && <Options options={catalog.INTRO_MINUTES.map(m => ({ value: String(m), label: `${m} мин` }))} value={String(t.intro.minutes)} onChange={v => save({ intro: { ...t.intro, minutes: Number(v) } })} />}
      <p className="small">Одно на каждого ученика. Без оплаты, поэтому от неявки не защищено.</p>
    </div>
  );

  /* ---------- step 3 ---------- */
  const prices = t.prices.filter(p => t.subjects.some(s => s.subject === p.subject));
  const missing = t.subjects.flatMap(s => catalog.DURATIONS.filter(m => !t.prices.some(p => p.subject === s.subject && p.minutes === m)).map(m => ({ subject: s.subject, minutes: m })));
  const setPrice = (p: PriceItem, raw: string) => {
    const v = parseMoney(raw);
    setPriceDraft(x => ({ ...x, [p.id]: raw }));
    if (v >= 300 && v <= 50000) run(() => tApi.setPrices(t.prices.map(x => (x.id === p.id ? { ...x, price: v } : x))));
  };
  const addPrice = (subject: string, minutes: number) => {
    const base = t.prices.find(p => p.subject === subject && p.minutes === 60)?.price ?? t.prices[0]?.price ?? 1500;
    run(() => tApi.setPrices([...t.prices, { id: uid('pr'), subject, minutes, price: Math.round((base * minutes) / 60 / 50) * 50 }]));
    setAddMenu(false);
  };
  const removePrice = (p: PriceItem) => run(() => tApi.setPrices(t.prices.filter(x => x.id !== p.id)));
  const moneyInput = (p: PriceItem) => {
    const raw = priceDraft[p.id] ?? String(p.price);
    const v = parseMoney(raw);
    const bad = v < 300 || v > 50000;
    return (
      <label className="r2-money" style={bad ? { boxShadow: '0 0 0 2px var(--red)' } : undefined}>
        <input value={v ? v.toLocaleString('ru-RU').replace(/\s/g, NB) : ''} inputMode="numeric" aria-label={`Ваша цена: ${p.subject}, ${p.minutes} мин, ₽`} aria-invalid={bad || undefined} onChange={e => setPrice(p, e.target.value)} onBlur={() => setPriceDraft(x => { const n = { ...x }; delete n[p.id]; return n; })} />
        <span>₽</span>
      </label>
    );
  };
  const addBtn = missing.length > 0 && (
    <div className="filter" data-dd-anchor>
      <Btn size="m" icon="plus" onClick={() => setAddMenu(v => !v)}>Добавить длительность</Btn>
      <Dropdown open={addMenu} onClose={() => setAddMenu(false)}>{missing.map(m => <MenuItem key={`${m.subject}${m.minutes}`} onClick={() => addPrice(m.subject, m.minutes)}>{`${catalog.shortSubject(m.subject)} · ${m.minutes} мин`}</MenuItem>)}</Dropdown>
    </div>
  );
  const priceRows = phone ? (
    <div className="r2-price">
      {prices.map(p => (
        <div className="r2-prow" key={p.id}>
          <div><b>{catalog.shortSubject(p.subject)}</b><span className="small">{`${p.minutes}${NB}мин`}{prices.length > 1 && <> · <button type="button" className="btn-link" style={{ fontSize: 13 }} onClick={() => removePrice(p)}>убрать</button></>}</span></div>
          {moneyInput(p)}
          <div className="pay"><span>Ученик заплатит</span><b className="money">{fmtMoney(studentPrice(parseMoney(priceDraft[p.id] ?? String(p.price))))}</b></div>
        </div>
      ))}
    </div>
  ) : (
    <div className="r2-ptable">
      <div className="th"><span>Предмет</span><span>Длительность</span><span className="num">Ваша цена {REQ}</span><span className="num">Ученик заплатит</span><span /></div>
      {prices.map(p => (
        <div key={p.id}><b>{catalog.shortSubject(p.subject)}</b><span>{`${p.minutes}${NB}мин`}</span>{moneyInput(p)}<span className="money num">{fmtMoney(studentPrice(parseMoney(priceDraft[p.id] ?? String(p.price))))}</span><IBtn icon="x" label="Удалить" onClick={() => removePrice(p)} /></div>
      ))}
    </div>
  );
  const noSubjects = !t.subjects.length && <Note tone="action">Сначала добавьте предмет на шаге 2.</Note>;
  const calcBase = prices.find(p => p.minutes === 60) ?? prices[0];
  const calc = calcBase && (
    <div className="summary r2-calc r2-stick" style={{ maxWidth: 'none' }}>
      <h4>Как считается цена</h4>
      <dl><div><dt>{`Ваша цена, ${calcBase.minutes}${NB}мин`}</dt><dd>{fmtMoney(calcBase.price)}</dd></div><div><dt>{`Сервис TopRepet, 10${NB}%`}</dt><dd>{fmtMoney(serviceFee(calcBase.price))}</dd></div></dl>
      <div className="total"><span className="small" style={{ fontSize: 15, fontWeight: 650 }}>Ученик платит</span><b>{fmtMoney(studentPrice(calcBase.price))}</b></div>
      <p className="hint">Вы получаете ровно свою цену. Комиссию платит ученик, а не вы.</p>
    </div>
  );
  /* every subject gets a 60-minute price to start with */
  useEffect(() => {
    if (step !== 3) return;
    const need = t.subjects.filter(s => !t.prices.some(p => p.subject === s.subject));
    if (need.length) run(() => tApi.setPrices([...t.prices, ...need.map(s => ({ id: uid('pr'), subject: s.subject, minutes: 60, price: t.prices[0]?.price ?? 1500 }))]));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- step 4 ---------- */
  const paint = useMemo(() => (cells: [number, number][], on: boolean) => {
    const w = t.weekly.map(r => [...r]);
    for (const [dd, hh] of cells) w[dd][hh] = on;
    run(() => tApi.saveTutor({ weekly: w }));
  }, [t.weekly, run]);
  const hoursCount = schedule.weeklyHoursCount(t);
  const tzLine = <Tz>{`Ваше время: ${zoneCity(t.tz)}, ${utcLabel(t.tz)}. Ученики увидят его в своём поясе.`}</Tz>;
  const legendReg = <div className="legend"><span><i className="r2-on" />Открыто для записи</span><span><i className="r2-off" />Закрыто</span></div>;
  const grid = (big: boolean) => <WeekGrid hours={HOURS} head={DAYS.map(x => ({ label: x }))} cell={(dd, hh) => (t.weekly[dd][hh] ? 'on' : '')} big={big} onPaint={paint} label="Регулярная неделя" />;
  const rules = (
    <div className="card">
      <span className="r2-lbl">Записываться ко мне можно на</span>
      <Seg className="r2-seg" full value={t.horizonWeeks} onChange={v => save({ horizonWeeks: v })} items={[{ value: 1, label: '1 неделю' }, { value: 2, label: '2 недели' }, { value: 4, label: '4 недели' }]} />
      <span className="small">Постоянные ученики могут оформить серию и дальше этого срока</span>
      <span className="r2-lbl" style={{ marginTop: 6 }}>Не позже чем за</span>
      <Seg className="r2-seg" full value={t.minNoticeHours} onChange={v => save({ minNoticeHours: v })} items={[{ value: 2, label: '2 часа' }, { value: 12, label: '12 часов' }, { value: 24, label: '24 часа' }]} />
      <span className="small">Ближе к уроку окно для записи закрывается</span>
    </div>
  );
  const hoursLabel = `${hoursCount}${NB}${hoursCount % 10 === 1 && hoursCount % 100 !== 11 ? 'час' : [2, 3, 4].includes(hoursCount % 10) && ![12, 13, 14].includes(hoursCount % 100) ? 'часа' : 'часов'} в неделю`;

  /* ---------- frame ---------- */
  const canNext = step === 1 ? !!text.name.trim() : step === 2 ? t.subjects.length > 0 : step === 3 ? prices.length > 0 && prices.every(p => p.price >= 300) : true;
  const next = () => {
    if (!canNext) return toast(step === 1 ? 'Укажите имя' : step === 2 ? 'Добавьте хотя бы один предмет' : 'Укажите цену от 300 ₽', { tone: 'bad' });
    if (step < 4) go(step + 1);
    else { flush(); navigate('/tutor/profile/publish'); }
  };
  const nextLabel = step === 4 ? (t.published ? 'Готово' : 'К публикации') : 'Дальше';
  const headings = ['Расскажите о себе', 'Что вы преподаёте', 'Сколько стоят занятия', 'Когда вы принимаете учеников'];
  const progM = (
    <div className="progress" style={{ '--n': 4, maxWidth: 'none' } as React.CSSProperties}>
      <div className="bars" aria-hidden="true">{[1, 2, 3, 4].map(i => <i key={i} className={i <= step ? 'on' : undefined} />)}</div>
      <div className="capt"><span>Шаг <b>{`${step}${NB}из${NB}4`}</b></span><SavedMark t={t} /></div>
    </div>
  );
  const progD = (
    <div className="r2-head">
      <div className="between"><span className="small" style={{ fontWeight: 650 }}>{`Шаг ${step}${NB}из${NB}4`}</span><SavedMark t={t} /></div>
      <div className="r2-steps">{STEP_NAMES.map((s, i) => <button key={s} type="button" onClick={() => go(i + 1)} className={cx(i < step && 'on', i === step - 1 && 'cur')} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', font: 'inherit' }}><i />{`${i + 1}. ${s}`}</button>)}</div>
    </div>
  );
  const body = step === 1 ? <>{step1}{docsAlert}</>
    : step === 2 ? <>{search}{subjectCards}{formats}{phone && intro}</>
      : step === 3 ? <>{noSubjects}{phone && <Note tone="action" icon="wallet">Вы получаете ровно свою цену. Ученик платит её плюс 10 % сервиса TopRepet.</Note>}{!phone && <p className="sub">Цена {REQ} для каждого предмета и длительности. Справа сразу видно, сколько заплатит ученик.</p>}{priceRows}<div>{addBtn}</div><p className="small">{`Цены можно менять в любой момент. Уже оплаченные уроки останутся по${NB}старой цене.`}</p></>
        : <>{phone ? <><p className="sub">Проведите по ячейкам, чтобы открыть время.</p>{tzLine}<div className="card" style={{ padding: '14px 12px' }}>{grid(false)}<div className="between" style={{ padding: '4px 4px 0' }}>{legendReg}</div></div><p className="small">{nb(`Открыто ${hoursLabel}: ${schedule.describeWeekly(t.weekly)}`)}</p><Btn size="m" block icon="cal" to="/tutor/schedule/exceptions">Отпуск, выходной или разовое окно</Btn>{rules}</> : <><div className="between"><p className="sub">Проведите по ячейкам, чтобы открыть время.</p>{legendReg}</div><div className="card" style={{ padding: 18 }}>{grid(true)}</div></>}</>;
  const side = step === 1 ? <><div className="card"><b className="h3">Для публикации нужно</b><ReqList t={t} /><p className="small">Звёздочкой <span className="r2-req">*</span> отмечены обязательные поля. Остальное повышает шансы, что выберут вас.</p></div><PrevCard t={t} /></>
    : step === 2 ? <>{intro}<Note tone="action">Предметы, цели и категории учеников нужны, чтобы вас находили в поиске и присылали подходящие заявки.</Note></>
      : step === 3 ? calc
        : <><div className="card"><b className="h3">{hoursLabel}</b><span className="small" style={{ fontSize: 15 }}>{schedule.describeWeekly(t.weekly)}</span>{tzLine}<Btn size="m" block icon="cal" to="/tutor/schedule/exceptions">Отпуск или разовое окно</Btn></div>{rules}</>;

  if (phone)
    return (
      <Page title="Анкета" back="/tutor/profile" onBack={step > 1 ? () => go(step - 1) : undefined} bottom={<ActionBar>{step > 1 && <Btn size="m" onClick={() => go(step - 1)}>Назад</Btn>}<Btn v="primary" size="m" onClick={next}>{nextLabel}</Btn></ActionBar>}>
        {progM}
        <h1 className="h1">{headings[step - 1]}</h1>
        {body}
      </Page>
    );
  return (
    <Page title="Анкета">
      <div style={{ maxWidth: 1080, width: '100%', justifySelf: 'center', display: 'grid', gap: 24 }}>
        {progD}
        <div className="cols c2">
          <div className={step === 1 ? 'card' : undefined} style={step === 1 ? { padding: 28, gap: 22 } : { display: 'grid', gap: 16 }}>
            <h1 className="h1">{headings[step - 1]}</h1>
            {body}
            <div className="r2-actions">{step > 1 && <Btn size="m" onClick={() => go(step - 1)}>Назад</Btn>}<Btn v="primary" size="m" onClick={next}>{nextLabel}</Btn></div>
          </div>
          <div className="r2-stick" style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>{side}</div>
        </div>
      </div>
    </Page>
  );
}
