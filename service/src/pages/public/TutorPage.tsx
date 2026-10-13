import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { freeSlots, getPublicTutor, nextSlots, type PublicTutor } from '../../api/catalog';
import { useSession, useViewerZone } from '../../api/session';
import { photoUrl } from '../../api/tutor';
import { useAsync } from '../../api/useAsync';
import { GOAL_OPTIONS } from '../../lib/catalog';
import { fmtMoney } from '../../lib/money';
import { first, genitive } from '../../lib/names';
import { parseSelection, selectionQuery, type Selection } from '../../lib/selection';
import {
  addDaysKey,
  countLabel,
  dateKey,
  fmtDateKey,
  fmtDayTime,
  fmtTime,
  hoursDiffText,
  now,
  parseDateKey,
  weekdayOfKey,
  weekdayShort,
  zoneAt,
  zoneBy,
  zoneDiffHours,
} from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';
import { SlotList, TakenAlert } from '../../ui/Slots';
import { LoginForm } from '../auth/LoginForm';
import { NotFound } from '../common/NotFound';
import { reachGoal } from '../../app/metrika';

/* «Репетитор по математике»: subjects in the dative for titles and links. */
const SUBJECT_DAT: Record<string, string> = {
  english: 'английскому языку',
  math: 'математике',
  russian: 'русскому языку',
  physics: 'физике',
  chemistry: 'химии',
  informatics: 'информатике',
  history: 'истории',
  social: 'обществознанию',
  biology: 'биологии',
  literature: 'литературе',
  german: 'немецкому языку',
  french: 'французскому языку',
  spanish: 'испанскому языку',
  chinese: 'китайскому языку',
  geography: 'географии',
  primary: 'предметам начальной школы',
  preschool: 'подготовке к школе',
};
export const subjectDat = (slug: string, name: string) => SUBJECT_DAT[slug] ?? name.toLowerCase();

const yearsLabel = (n: number) => `${countLabel(n, 'год', 'года', 'лет')} опыта`;
const WEEK = 7;

/** /teachers/:id/ (mockups profile, profileTaken, loginModal): the profile with the booking block (У2.1). */
export function TutorPage() {
  const { id = '' } = useParams();
  const tutor = useAsync(() => getPublicTutor(id), id);
  if (tutor.loading) return <Loading />;
  if (tutor.error) return <LoadError title="Не получилось загрузить анкету" onRetry={tutor.reload} />;
  if (!tutor.data) return <NotFound />;
  return <Profile t={tutor.data} />;
}

function Profile({ t }: { t: PublicTutor }) {
  const tz = useViewerZone();
  const firstName = first(t.name);
  const offered = t.subjects.filter(s => t.prices.some(p => p.subjectId === s.id));
  const minPrice = Math.min(...t.prices.map(p => (p.priceRub * 60) / p.durationMin));
  const main = offered[0];
  usePageMeta(main ? `Репетитор по ${subjectDat(main.slug, main.name)} онлайн: ${t.name} | TopRepet` : `${t.name} | TopRepet`, {
    description: `${t.name}, репетитор по ${main ? subjectDat(main.slug, main.name) : 'школьным предметам'} онлайн${
      t.experienceYears ? `: ${yearsLabel(t.experienceYears)}` : ''
    }${t.goals.length ? `, ${GOAL_OPTIONS.filter(g => t.goals.includes(g.id)).map(g => g.label).slice(0, 2).join(' и ')}` : ''}. Цена от ${
      Number.isFinite(minPrice) ? fmtMoney(Math.round(minPrice)) : '—'
    }, запись в свободное время прямо на странице.`,
  });

  const [photoBroken, setPhotoBroken] = useState(false);
  const url = photoBroken ? null : photoUrl(t.photoPath);
  const goals = GOAL_OPTIONS.filter(g => t.goals.includes(g.id));
  const topics = t.subjects.filter(s => s.topics.trim());

  return (
    <>
      <Link className="back" to="/teachers/">
        Все преподаватели
      </Link>
      <div className="two">
        <div className="stack l">
          <div className="halves">
            <div className={`tc pf${url ? ' has' : ''}`}>{url ? <img src={url} alt={`${t.name}, фото`} onError={() => setPhotoBroken(true)} /> : null}</div>
            <div className="stack">
              <h1 className="h1">{t.name}</h1>
              <p className="mut">
                {t.subjects.map(s => s.name).join(', ')}
                {t.experienceYears ? ` · ${yearsLabel(t.experienceYears)}` : ''}
              </p>
              {goals.length ? (
                <ul className="chips" aria-label="С чем помогает">
                  {goals.map(g => (
                    <li key={g.id} className="chip">
                      {g.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              {t.about ? <p className="pre">{t.about}</p> : null}
            </div>
          </div>
          {topics.length ? (
            <section className="stack">
              <h2 className="h2">Предметы и&nbsp;темы</h2>
              {topics.map(s => (
                <div key={s.id} className="card f">
                  <b>{s.name}</b>
                  <span className="mut pre">{s.topics}</span>
                </div>
              ))}
            </section>
          ) : null}
          {t.education ? (
            <section className="stack">
              <h2 className="h2">Образование</h2>
              <div className="card f">
                <span className="pre">{t.education}</span>
              </div>
            </section>
          ) : null}
          <section className="stack">
            <h2 className="h2">Как проходят занятия</h2>
            {t.approach ? <p className="pre">{t.approach}</p> : null}
            <p className="mut">Онлайн по&nbsp;видеосвязи. Ссылку на&nbsp;звонок {firstName} присылает перед каждым занятием.</p>
          </section>
        </div>
        <aside className="sticky">
          <BookingBlock t={t} tz={tz} />
        </aside>
      </div>
    </>
  );
}

/* ---------- SlotPicker + BookingSummary ---------- */
function BookingBlock({ t, tz }: { t: PublicTutor; tz: string }) {
  const navigate = useNavigate();
  const { profile } = useSession();
  const [params, setParams] = useSearchParams();
  const sel = parseSelection(params);
  const firstName = first(t.name);

  const offered = t.subjects.filter(s => t.prices.some(p => p.subjectId === s.id));
  const subject = offered.find(s => s.slug === sel.subject) ?? offered[0];
  const lengths = subject ? t.prices.filter(p => p.subjectId === subject.id) : [];
  const price = lengths.find(p => p.durationMin === sel.dur) ?? lengths.find(p => p.durationMin === 60) ?? lengths[0];
  const dur = price?.durationMin ?? 60;

  const slots = useAsync(() => (subject ? freeSlots(t.id, dur) : Promise.resolve([])), `${t.id}|${dur}`);
  const list = useMemo(() => slots.data ?? [], [slots.data]);
  const chosen = sel.slot !== null && list.includes(sel.slot) ? sel.slot : null;
  const taken = slots.data && sel.slot !== null && chosen === null ? sel.slot : null;
  const nearest = useAsync(() => (taken !== null ? nextSlots(t.id, dur, taken) : Promise.resolve([])), `${t.id}|${dur}|${taken}`);

  /* days from the viewer's current date to the end of the horizon */
  const today = dateKey(now(), tz);
  const days = useMemo(() => {
    const out: string[] = [];
    const last = dateKey(now() + t.horizonWeeks * WEEK * 86_400_000, tz);
    for (let k = today; k <= last; k = addDaysKey(k, 1)) out.push(k);
    return out;
  }, [today, t.horizonWeeks, tz]);
  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const ts of list) {
      const k = dateKey(ts, tz);
      m.set(k, [...(m.get(k) ?? []), ts]);
    }
    return m;
  }, [list, tz]);
  /* no trailing week with nothing to book: the strip ends at the last free day (one full week at least) */
  const shown = useMemo(() => {
    let end = WEEK - 1;
    days.forEach((d, i) => { if (byDay.has(d)) end = Math.max(end, i); });
    return days.slice(0, end + 1);
  }, [days, byDay]);
  const firstFree = days.find(d => byDay.has(d)) ?? days[0];
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const day = (chosen !== null ? dateKey(chosen, tz) : null) ?? (pickedDay && byDay.has(pickedDay) ? pickedDay : null) ?? firstFree;
  const [page, setPage] = useState<number | null>(null);
  const dayPage = page ?? Math.max(0, Math.floor(shown.indexOf(day) / WEEK));
  const pages = Math.ceil(shown.length / WEEK);

  const update = (patch: Partial<Selection>) => {
    const next = { subject: subject?.slug ?? null, dur, slot: chosen, ...patch };
    setParams(new URLSearchParams(selectionQuery(next).slice(1)), { replace: true, preventScrollReset: true });
  };

  const [login, setLogin] = useState(false);
  const bookHref = `/book/${t.slug ?? t.id}${selectionQuery({ subject: subject?.slug ?? null, dur, slot: chosen })}`;
  // a guest who signed in inside the dialog goes straight to the booking form with the same slot
  useEffect(() => {
    if (login && profile) void navigate(bookHref);
  }, [login, profile, bookHref, navigate]);

  const notStudent = profile && profile.role !== 'student';
  const book = () => {
    if (chosen === null || notStudent) return;
    reachGoal('booking_start');
    if (!profile) setLogin(true);
    else void navigate(bookHref);
  };

  const diff = zoneDiffHours(t.tz, tz);
  const example = chosen ?? byDay.get(day)?.[0] ?? null;

  if (!offered.length || (slots.data && list.length === 0)) {
    return (
      <div className="sum">
        <span className="ttl">Запись на&nbsp;занятие</span>
        <p>
          Свободного времени пока нет. {firstName} откроет новые окна в&nbsp;расписании, загляните позже или выберите другого репетитора.
        </p>
        <Link className="btn s" to={subject ? `/teachers/?subject=${subject.slug}` : '/teachers/'}>
          {subject ? `Другие репетиторы по ${subjectDat(subject.slug, subject.name)}` : 'Другие репетиторы'}
        </Link>
      </div>
    );
  }

  return (
    <>
      <section className="sum book" aria-labelledby="book-ttl">
        <h2 className="ttl" id="book-ttl">
          Запись на&nbsp;занятие
        </h2>
        <fieldset className="stack s">
          <legend className="h3">Предмет</legend>
          <div className="opts">
            {offered.map(s => (
              <label key={s.id} className="opt">
                <input type="radio" name="subject" checked={s.id === subject.id} onChange={() => update({ subject: s.slug, dur: null, slot: null })} />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="stack s">
          <legend className="h3">Длительность</legend>
          <div className="opts">
            {lengths.map(p => (
              <label key={p.durationMin} className="opt">
                <input type="radio" name="dur" checked={p.durationMin === dur} onChange={() => update({ dur: p.durationMin, slot: null })} />
                {p.durationMin}&nbsp;мин<small>{fmtMoney(p.priceRub)}</small>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="stack s">
          <div className="row sb nw">
            <h3 className="h3">Дата и&nbsp;время</h3>
            <div className="row nw" style={{ gap: 4 }}>
              <span className="mut sm">{zoneBy(tz)}</span>
              {pages > 1 && slots.data ? (
                <>
                  <button type="button" className="pg-arr prev" aria-label="Предыдущая неделя" disabled={dayPage === 0} onClick={() => setPage(dayPage - 1)} />
                  <button type="button" className="pg-arr" aria-label="Следующая неделя" disabled={dayPage >= pages - 1} onClick={() => setPage(dayPage + 1)} />
                </>
              ) : null}
            </div>
          </div>
          {slots.loading ? (
            <Loading />
          ) : slots.error ? (
            <LoadError title="Не получилось загрузить свободное время" onRetry={slots.reload} />
          ) : (
            <>
              <fieldset className="days">
                <legend className="sr-only">Дни</legend>
                {shown.slice(dayPage * WEEK, dayPage * WEEK + WEEK).map(k => {
                  const has = byDay.has(k);
                  const { day: dnum } = parseDateKey(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`day${k === today ? ' now' : ''}${has ? '' : ' off'}${k === day ? ' on' : ''}`}
                      aria-pressed={k === day}
                      aria-label={fmtDateKey(k)}
                      disabled={!has}
                      onClick={() => {
                        setPickedDay(k);
                        if (chosen !== null && dateKey(chosen, tz) !== k) update({ slot: null });
                      }}
                    >
                      {weekdayShort(weekdayOfKey(k))}
                      <b>{dnum}</b>
                    </button>
                  );
                })}
              </fieldset>
              {taken !== null ? (
                <TakenAlert taken={taken} nearest={nearest.data} tz={tz} tutorTz={t.tz} onPick={ts => update({ slot: ts })} />
              ) : null}
              <SlotList
                slots={byDay.get(day) ?? []}
                tz={tz}
                tutorTz={t.tz}
                selected={chosen}
                day={day}
                onPick={ts => update({ slot: ts })}
                label={`Свободное время, ${fmtDateKey(day)}`}
              />
              {diff && example !== null ? (
                <p className="hint">
                  У&nbsp;{genitive(firstName)} {hoursDiffText(diff)}: {fmtTime(example, tz)} {zoneBy(tz)} = {fmtTime(example, t.tz)} {zoneAt(t.tz)}.
                </p>
              ) : null}
              <p className="hint">
                Окна на&nbsp;ближайшие {countLabel(t.minLeadHours, 'час', 'часа', 'часов')} не&nbsp;показываются.
              </p>
            </>
          )}
          <p className="hint">Оплата репетитору напрямую после подтверждения.</p>
        </div>
        <dl className="dl">
          <div>
            <dt>Занятие</dt>
            <dd>{chosen !== null ? fmtDayTime(chosen, tz) : 'выберите время'}</dd>
          </div>
          <div className="tot">
            <dt>Стоимость</dt>
            <dd>{price ? fmtMoney(price.priceRub) : '—'}</dd>
          </div>
        </dl>
        {notStudent ? <p className="hint">Записываться могут только ученики. Войдите в&nbsp;аккаунт ученика.</p> : null}
        <span className="only-d">
          <button type="button" className="btn p w" disabled={chosen === null || Boolean(notStudent)} onClick={book}>
            Записаться
          </button>
        </span>
      </section>
      <div className="mbar only-m">
        <div className="stack s" style={{ gap: 0 }}>
          {chosen !== null && price ? (
            <>
              <b>{fmtMoney(price.priceRub)}</b>
              <span className="mut sm">{fmtDayTime(chosen, tz)}</span>
            </>
          ) : (
            <span className="mut">Выберите время</span>
          )}
        </div>
        <button type="button" className="btn p" disabled={chosen === null || Boolean(notStudent)} onClick={book}>
          Записаться
        </button>
      </div>
      <Overlay open={login} onClose={() => setLogin(false)} className="dlg" label="Войдите, чтобы записаться">
        <div className="row sb nw">
          <h2 className="h2">Войдите, чтобы записаться</h2>
          <button type="button" className="x" aria-label="Закрыть" onClick={() => setLogin(false)} />
        </div>
        <div className="card f" style={{ padding: '14px 16px', gap: 2 }}>
          <span className="sm mut">Сохраним ваш выбор</span>
          <b>
            {t.name} · {chosen !== null ? fmtDayTime(chosen, tz) : ''}
          </b>
        </div>
        <LoginForm next={bookHref} />
      </Overlay>
    </>
  );
}

