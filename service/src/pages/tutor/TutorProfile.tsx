import { useId, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../api/session';
import {
  GOALS,
  MISSING_LABEL,
  MISSING_ORDER,
  PHOTO_TYPES,
  getMissing,
  getTutorProfile,
  listSubjects,
  photoUrl,
  publishTutor,
  saveTutorProfile,
  unpublishTutor,
  uploadTutorPhoto,
  type Goal,
  type Missing,
  type Price,
  type Subject,
  type TutorDraft,
  type TutorProfile as Saved,
} from '../../api/tutor';
import { useAsync } from '../../api/useAsync';
import { DURATIONS, parsePrice, parseYears } from '../../lib/prices';
import { ZONES, utcLabel, zoneCity } from '../../lib/time';
import { Field, SelectField, TextAreaField } from '../../ui/Field';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { reachGoal } from '../../app/metrika';

/* Р2.1 + Р2.1-публикация: /tutor/profile/, mockup screens tutorProfile and tutorProfileReady. */
export function TutorProfile() {
  usePageMeta('Анкета', { noindex: true });
  const { profile } = useSession();
  const id = profile?.id ?? '';
  const data = useAsync(() => Promise.all([getTutorProfile(id), listSubjects(), getMissing()]), id);

  if (data.loading) return <><h1 className="h1">Анкета</h1><Loading /></>;
  if (data.error || !data.data) return <LoadError title="Не получилось загрузить анкету" onRetry={data.reload} />;
  const [saved, subjects, missing] = data.data;
  return <ProfileForm id={id} initial={saved} subjects={subjects} initialMissing={missing} />;
}

const priceKey = (subjectId: number, duration: number) => `${subjectId}:${duration}`;

function priceTexts(prices: Price[]) {
  const out: Record<string, string> = {};
  for (const p of prices) out[priceKey(p.subjectId, p.durationMin)] = String(p.priceRub);
  return out;
}

type Notice = { ok: boolean; text: string } | null;

function ProfileForm({ id, initial, subjects, initialMissing }: { id: string; initial: Saved; subjects: Subject[]; initialMissing: Missing[] }) {
  const { refresh } = useSession();
  const [saved, setSaved] = useState(initial);
  const [serverMissing, setServerMissing] = useState(initialMissing);
  const [name, setName] = useState(initial.name);
  const [tz, setTz] = useState(initial.tz);
  const [about, setAbout] = useState(initial.about);
  const [education, setEducation] = useState(initial.education);
  const [approach, setApproach] = useState(initial.approach);
  const [years, setYears] = useState(initial.experienceYears === null ? '' : String(initial.experienceYears));
  const [goals, setGoals] = useState<Goal[]>(initial.goals);
  const [chosen, setChosen] = useState(initial.subjects);
  const [prices, setPrices] = useState(() => priceTexts(initial.prices));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const listId = useId();

  const status = saved.status;
  const subjectName = (sid: number) => subjects.find(s => s.id === sid)?.name ?? '';
  const zones = ZONES.some(z => z.id === tz) ? ZONES : [{ id: tz, city: zoneCity(tz) }, ...ZONES];

  /* the checklist follows what is on the screen; free time comes from the saved schedule */
  const hasPrice = chosen.some(s => DURATIONS.some(d => parsePrice(prices[priceKey(s.subjectId, d)] ?? '').value !== null));
  const missing = MISSING_ORDER.filter(m =>
    m === 'photo' ? !saved.photoPath : m === 'name' ? !name.trim() : m === 'subject_price' ? !hasPrice : serverMissing.includes('window'),
  );

  function validate(): TutorDraft | null {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Напишите имя и фамилию: так вас увидят ученики.';
    const y = parseYears(years);
    if (y.error) errs.years = y.error;
    const list: Price[] = [];
    for (const s of chosen) {
      for (const d of DURATIONS) {
        const key = priceKey(s.subjectId, d);
        const p = parsePrice(prices[key] ?? '');
        if (p.error) errs[key] = p.error;
        else if (p.value !== null) list.push({ subjectId: s.subjectId, durationMin: d, priceRub: p.value });
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      setNotice({ ok: false, text: 'Проверьте поля с ошибками: анкета не сохранена.' });
      return null;
    }
    return { name, tz, about, education, approach, experienceYears: y.value, goals, subjects: chosen, prices: list };
  }

  async function persist(): Promise<boolean> {
    const draft = validate();
    if (!draft) return false;
    try {
      await saveTutorProfile(id, draft, saved);
      const [fresh, fm] = await Promise.all([getTutorProfile(id), getMissing()]);
      setSaved(fresh);
      setServerMissing(fm);
      setPrices(priceTexts(fresh.prices));
      await refresh();
      return true;
    } catch {
      setNotice({ ok: false, text: 'Не получилось сохранить. Проверьте интернет и попробуйте ещё раз.' });
      return false;
    }
  }

  async function save(e?: SubmitEvent<HTMLFormElement>) {
    e?.preventDefault();
    setBusy(true);
    setNotice(null);
    if (await persist()) setNotice({ ok: true, text: status === 'published' ? 'Изменения сохранены и видны в каталоге.' : 'Сохранили анкету.' });
    setBusy(false);
  }

  async function publish() {
    setBusy(true);
    setNotice(null);
    if (await persist()) {
      const res = await publishTutor();
      if (res.ok) {
        reachGoal('tutor_published');
        setSaved(s => ({ ...s, status: 'published' }));
        setNotice({ ok: true, text: 'Анкета опубликована и видна в каталоге «Топ репеты».' });
      } else if (res.reason === 'not_ready') {
        setServerMissing(res.missing);
        setNotice({ ok: false, text: `Для публикации не хватает: ${res.missing.map(m => MISSING_LABEL[m].toLowerCase()).join(', ')}.` });
      } else {
        setNotice({ ok: false, text: 'Не получилось опубликовать анкету. Попробуйте ещё раз.' });
      }
    }
    setBusy(false);
  }

  async function hide() {
    setBusy(true);
    setNotice(null);
    try {
      await unpublishTutor();
      setSaved(s => ({ ...s, status: 'draft' }));
      setNotice({ ok: true, text: 'Анкета скрыта из каталога. Опубликуйте её снова, когда будете готовы.' });
    } catch {
      setNotice({ ok: false, text: 'Не получилось скрыть анкету. Попробуйте ещё раз.' });
    }
    setBusy(false);
  }

  function addSubject(e: ChangeEvent<HTMLSelectElement>) {
    const sid = Number(e.target.value);
    if (sid && !chosen.some(s => s.subjectId === sid)) setChosen([...chosen, { subjectId: sid, topics: '' }]);
    e.target.value = '';
  }

  function removeSubject(sid: number) {
    setChosen(chosen.filter(s => s.subjectId !== sid));
    setPrices(p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith(`${sid}:`))));
  }

  return (
    <>
      <div className="row sb">
        <h1 className="h1">Анкета</h1>
        {status === 'published' ? <span className="pill ok">Опубликована</span> : null}
        {status === 'hidden' ? <span className="pill bad">Скрыта администратором</span> : null}
      </div>
      {notice ? (
        <output className={notice.ok ? 'toast' : 'alert'} role={notice.ok ? 'status' : 'alert'}>
          {notice.text}
        </output>
      ) : null}
      <div className="two">
        <form id="tutor-profile" className="stack l" onSubmit={save} noValidate aria-label="Анкета">
          <Photo id={id} path={saved.photoPath} onChange={path => {
            setSaved(s => ({ ...s, photoPath: path }));
            setServerMissing(m => m.filter(x => x !== 'photo'));
          }} />
          <Field label="Имя и фамилия" autoComplete="name" value={name} onChange={e => setName(e.target.value)} error={errors.name} maxLength={80} />
          <TextAreaField
            label="О себе"
            value={about}
            onChange={e => setAbout(e.target.value)}
            maxLength={2000}
            placeholder="С кем занимаетесь и чего помогаете добиться"
          />
          <TextAreaField
            label="Образование и достижения"
            value={education}
            onChange={e => setEducation(e.target.value)}
            maxLength={2000}
            placeholder="Вуз, сертификаты, результаты учеников"
          />
          <TextAreaField
            label="Подход к занятиям"
            value={approach}
            onChange={e => setApproach(e.target.value)}
            maxLength={2000}
            placeholder="Как строите занятие и что даёте делать дома"
          />

          <div className="stack s">
            <b className="h3" id="subj-title">Предметы</b>
            <div className="chips">
              {chosen.map(s => (
                <span key={s.subjectId} className="chip on">
                  {subjectName(s.subjectId)}
                  <button type="button" className="chip-x" aria-label={`Убрать предмет ${subjectName(s.subjectId)}`} onClick={() => removeSubject(s.subjectId)} />
                </span>
              ))}
              <select className="chip add" aria-label="Добавить предмет" value="" onChange={addSubject}>
                <option value="">+ Добавить</option>
                {subjects
                  .filter(s => !chosen.some(c => c.subjectId === s.id))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
            {chosen.length === 0 ? <span className="hint">Добавьте хотя бы один предмет, чтобы указать цены.</span> : null}
            {chosen.map(s => (
              <Field
                key={s.subjectId}
                label={`Темы: ${subjectName(s.subjectId)}`}
                value={s.topics}
                maxLength={300}
                placeholder="Например: грамматика, разговорная практика, IELTS"
                onChange={e => setChosen(chosen.map(c => (c.subjectId === s.subjectId ? { ...c, topics: e.target.value } : c)))}
              />
            ))}
          </div>

          <fieldset className="stack s">
            <legend className="h3">С чем помогаете</legend>
            <div className="opts">
              {GOALS.map(g => (
                <label key={g.id} className="opt">
                  <input
                    type="checkbox"
                    checked={goals.includes(g.id)}
                    onChange={e => setGoals(e.target.checked ? [...goals, g.id] : goals.filter(x => x !== g.id))}
                  />
                  {g.label}
                </label>
              ))}
            </div>
            <span className="hint">По этим целям ученики находят вас в&nbsp;фильтре «Цель»</span>
          </fieldset>

          <Field
            label="Опыт преподавания"
            inputMode="numeric"
            value={years}
            onChange={e => setYears(e.target.value)}
            error={errors.years}
            hint="Полных лет. Для фильтра «Опыт»"
            style={{ maxWidth: 160 }}
          />
          <SelectField label="Часовой пояс" value={tz} onChange={e => setTz(e.target.value)} hint="В этом поясе вы задаёте расписание">
            {zones.map(z => (
              <option key={z.id} value={z.id}>
                {z.city}, {utcLabel(z.id)}
              </option>
            ))}
          </SelectField>

          <div className="stack s">
            <b className="h3">Цены</b>
            {chosen.length === 0 ? <span className="mut sm">Сначала добавьте предмет.</span> : null}
            {chosen.map(s =>
              DURATIONS.map(d => {
                const key = priceKey(s.subjectId, d);
                return (
                  <PriceRow
                    key={key}
                    subject={subjectName(s.subjectId)}
                    duration={d}
                    value={prices[key] ?? ''}
                    error={errors[key]}
                    onChange={v => setPrices(p => ({ ...p, [key]: v }))}
                  />
                );
              }),
            )}
            <span className="mut sm">Оставьте пустым, если занятий такой длины нет. Ученик видит вашу цену и&nbsp;платит вам напрямую после подтверждения.</span>
          </div>
        </form>

        <aside className="sticky">
          <section className="sum" aria-labelledby="pub-ttl">
            <span className="ttl" id="pub-ttl">
              Для публикации
            </span>
            <ul className="chk" id={listId} aria-label="Что нужно для публикации">
              {MISSING_ORDER.map(m => {
                const done = !missing.includes(m);
                return (
                  <li key={m} className={done ? 'y' : 'n'}>
                    {MISSING_LABEL[m]}
                    <span className="sr-only">{done ? ' — готово' : ' — не хватает'}</span>
                  </li>
                );
              })}
            </ul>
            {missing.includes('window') ? (
              <Link className="btn s" to="/tutor/schedule/">
                Добавить время
              </Link>
            ) : null}
            {status === 'published' ? (
              <>
                <button type="submit" form="tutor-profile" className="btn p w" disabled={busy}>
                  Сохранить изменения
                </button>
                <button type="button" className="btn w" disabled={busy} onClick={() => void hide()}>
                  Скрыть из&nbsp;каталога
                </button>
                <p className="hint">Скрытая анкета пропадёт из&nbsp;каталога, записи останутся.</p>
              </>
            ) : status === 'hidden' ? (
              <>
                <p className="hint">Анкету скрыл администратор. Напишите в&nbsp;поддержку, чтобы вернуть её в&nbsp;каталог.</p>
                <button type="submit" form="tutor-profile" className="btn p w" disabled={busy}>
                  Сохранить
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn p w" disabled={busy || missing.length > 0} aria-describedby={listId} onClick={() => void publish()}>
                  Опубликовать
                </button>
                <button type="submit" form="tutor-profile" className="btn w" disabled={busy}>
                  Сохранить
                </button>
                <p className="hint">Анкета появится в&nbsp;каталоге сразу, без проверки.</p>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function PriceRow({ subject, duration, value, error, onChange }: { subject: string; duration: number; value: string; error?: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="prow">
      <label htmlFor={id} className="stack s" style={{ gap: 0 }}>
        <b>{subject}</b>{' '}
        <span className="mut sm">за {duration}&nbsp;минут</span>
      </label>
      <span className="pin">
        <input
          id={id}
          className="inp"
          inputMode="numeric"
          value={value}
          placeholder="—"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={e => onChange(e.target.value)}
        />
        <span aria-hidden="true">₽</span>
      </span>
      {error ? (
        <span className="err" id={`${id}-err`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function Photo({ id, path, onChange }: { id: string; path: string | null; onChange: (path: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputId = useId();
  const url = photoUrl(path);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    const res = await uploadTutorPhoto(id, file, path);
    setBusy(false);
    if (res.ok) onChange(res.path);
    else setError(res.error);
  }

  return (
    <div className="row nw" style={{ alignItems: 'flex-start' }}>
      <div className={`tc ph${url ? ' has' : ''}`} style={{ width: 110, flex: 'none' }}>
        {url ? <img src={url} alt="Ваше фото в анкете" /> : null}
      </div>
      <div className="stack s">
        <label htmlFor={inputId} className="btn s" aria-disabled={busy || undefined}>
          {busy ? 'Загружаем…' : url ? 'Заменить фото' : 'Загрузить фото'}
        </label>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept={PHOTO_TYPES.join(',')}
          aria-describedby={`${inputId}-hint${error ? ` ${inputId}-err` : ''}`}
          disabled={busy}
          onChange={e => void pick(e)}
        />
        <span className="hint" id={`${inputId}-hint`}>
          Вертикальное 4:5, лицо по&nbsp;центру. JPEG, PNG или WebP до&nbsp;5&nbsp;МБ
        </span>
        {error ? (
          <span className="err" id={`${inputId}-err`} role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
