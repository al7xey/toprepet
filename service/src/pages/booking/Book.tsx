import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createBooking, type BookingError } from '../../api/booking';
import { freeSlots, getPublicTutor, nextSlots, tutorPath, type PublicTutor } from '../../api/catalog';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { fmtMoney } from '../../lib/money';
import { first, genitive } from '../../lib/names';
import { parseSelection, selectionQuery } from '../../lib/selection';
import { countLabel, fmtDayAt, fmtDayTime, fmtRange, fmtTime, HOUR, now, zoneBy } from '../../lib/time';
import { Field } from '../../ui/Field';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { TakenAlert } from '../../ui/Slots';
import { NotFound } from '../common/NotFound';

/** /book/:teacherId (mockup book): for whom, the chosen time, one sum and «Записаться» (У3.3 + У4.1, У4.1-занят, У4.2). */
export function Book() {
  usePageMeta('Оформление записи', { noindex: true });
  const { id = '' } = useParams();
  const tutor = useAsync(() => getPublicTutor(id), id);
  if (tutor.loading) return <Loading />;
  if (tutor.error) return <LoadError title="Не получилось загрузить запись" onRetry={tutor.reload} />;
  if (!tutor.data || !tutor.data.published) return <NotFound />;
  return <BookForm t={tutor.data} />;
}

const ERRORS: Partial<Record<BookingError, string>> = {
  not_available: 'Репетитор больше не проводит занятия по этому предмету с такой длительностью. Вернитесь в анкету и выберите другое занятие.',
  blocked: 'Аккаунт заблокирован, записаться не получится. Напишите в поддержку.',
  wrong_role: 'Записываться могут только ученики. Войдите в аккаунт ученика.',
  not_signed_in: 'Войдите снова, чтобы записаться.',
  network: 'Не получилось записаться. Проверьте интернет и попробуйте ещё раз.',
};

function BookForm({ t }: { t: PublicTutor }) {
  const tz = useViewerZone();
  const { profile } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sel = parseSelection(params);
  const firstName = first(t.name);

  const subject = t.subjects.find(s => s.slug === sel.subject);
  const price = subject ? t.prices.find(p => p.subjectId === subject.id && p.durationMin === sel.dur) : undefined;
  const slot = sel.slot;

  const [forOther, setForOther] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [errors, setErrors] = useState<{ name?: string; age?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [takenAt, setTakenAt] = useState<number | null>(null);

  // the slot may have gone while the visitor was signing in: check it before the form is filled
  const check = useAsync(
    async () => {
      if (!price || slot === null) return true;
      const free = await freeSlots(t.id, price.durationMin, slot, slot + 60_000);
      return free.includes(slot);
    },
    `${t.id}|${price?.durationMin}|${slot}`,
  );
  const taken = takenAt ?? (check.data === false && slot !== null ? slot : null);
  const nearest = useAsync(() => (taken !== null && price ? nextSlots(t.id, price.durationMin, taken) : Promise.resolve([])), `${taken}`);

  const profileHref = `${tutorPath(t)}${selectionQuery({ subject: subject?.slug ?? null, dur: price?.durationMin ?? null, slot })}`;

  if (!subject || !price || slot === null) {
    return (
      <div className="stack l">
        <h1 className="h1">Оформление записи</h1>
        <div className="card f">
          <b className="h3">Время не&nbsp;выбрано</b>
          <p className="mut">Выберите предмет, длительность и&nbsp;свободное время в&nbsp;анкете {genitive(firstName)}.</p>
          <Link className="btn s" to={profileHref} style={{ justifySelf: 'start' }}>
            К&nbsp;анкете {genitive(firstName)}
          </Link>
        </div>
      </div>
    );
  }

  const end = slot + price.durationMin * 60_000;
  const deadline = Math.min(now() + 24 * HOUR, slot - 2 * HOUR);
  const student = forOther ? `${name.trim() || '—'}${age ? `, ${countLabel(Number(age), 'год', 'года', 'лет')}` : ''}` : (profile?.name ?? '');
  const theirs = fmtTime(slot, t.tz) !== fmtTime(slot, tz) ? `, у ${genitive(firstName)} ${fmtTime(slot, t.tz)}` : '';

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || taken !== null) return;
    const errs: typeof errors = {};
    const ageNum = Number(age);
    if (forOther) {
      if (!name.trim()) errs.name = 'Напишите имя ученика.';
      if (!/^\d{1,3}$/.test(age.trim()) || ageNum < 1 || ageNum > 120) errs.age = 'Укажите возраст числом от 1 до 120.';
    }
    setErrors(errs);
    if (errs.name || errs.age) return;
    setBusy(true);
    const res = await createBooking({
      tutorId: t.id,
      subjectId: subject!.id,
      durationMin: price!.durationMin,
      startsAt: slot!,
      forOther,
      name,
      age: forOther ? ageNum : null,
    });
    setBusy(false);
    if (res.ok) {
      void navigate(`/book/${res.id}/done`, { replace: true });
      return;
    }
    if (res.reason === 'slot_taken' || res.reason === 'slot_unavailable') setTakenAt(slot);
    else if (res.reason === 'participant_required') setErrors({ name: 'Напишите имя ученика.', age: 'Укажите возраст числом от 1 до 120.' });
    else setErrors({ form: ERRORS[res.reason] });
  }

  const pick = (ts: number) => {
    setTakenAt(null);
    setErrors({});
    setParams(new URLSearchParams(selectionQuery({ subject: subject.slug, dur: price.durationMin, slot: ts }).slice(1)), { replace: true });
  };

  const blocked = taken !== null || check.loading;

  return (
    <>
      <Link className="back" to={profileHref}>
        К&nbsp;анкете {genitive(firstName)}
      </Link>
      <h1 className="h1">Оформление записи</h1>
      <form id="book-form" className="two" onSubmit={submit} noValidate>
        <div className="stack l">
          <fieldset className="stack">
            <legend className="h2">Для кого занятия?</legend>
            <div className="opts">
              <label className="opt">
                <input type="radio" name="for" checked={!forOther} onChange={() => setForOther(false)} />
                Для себя
              </label>
              <label className="opt">
                <input type="radio" name="for" checked={forOther} onChange={() => setForOther(true)} />
                Для другого человека
              </label>
            </div>
            {forOther ? (
              <>
                <div className="halves stack">
                  <Field label="Имя" name="participant" autoComplete="off" maxLength={60} value={name} onChange={e => setName(e.target.value)} error={errors.name} />
                  <Field
                    label="Возраст"
                    name="age"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={3}
                    value={age}
                    onChange={e => setAge(e.target.value.replace(/\D/g, ''))}
                    error={errors.age}
                  />
                </div>
                <span className="hint">
                  {firstName} увидит имя и&nbsp;возраст в&nbsp;записи.
                </span>
              </>
            ) : null}
          </fieldset>

          <section className="stack" aria-labelledby="time-ttl">
            <h2 className="h2" id="time-ttl">
              Время
            </h2>
            {taken !== null ? (
              <TakenAlert taken={taken} nearest={nearest.data} tz={tz} tutorTz={t.tz} onPick={pick} />
            ) : (
              <div className="card f" style={{ padding: '14px 16px' }}>
                <div className="row sb">
                  <div className="stack s" style={{ gap: 0 }}>
                    <b>{fmtRange(slot, end, tz)}</b>
                    <span className="mut sm">
                      {zoneBy(tz)}
                      {theirs}
                    </span>
                  </div>
                  <Link className="lnk tap" to={profileHref}>
                    Изменить
                  </Link>
                </div>
              </div>
            )}
          </section>

          <div className="warm pay">
            <span className="ico" aria-hidden="true" />
            <p>
              Оплата репетитору напрямую после подтверждения. {firstName} ответит до&nbsp;{fmtDayAt(deadline, tz)} и&nbsp;напишет, как удобно оплатить.
            </p>
          </div>
        </div>

        <aside className="sticky">
          <section className="sum" aria-labelledby="sum-ttl">
            <h2 className="ttl" id="sum-ttl">
              Ваше занятие
            </h2>
            <div className="row nw">
              <span className="av" aria-hidden="true">
                {firstName.slice(0, 1)}
              </span>
              <div className="stack s" style={{ gap: 0 }}>
                <b>{t.name}</b>
                <span className="mut sm">{subject.name}</span>
              </div>
            </div>
            <dl className="dl">
              <div>
                <dt>Когда</dt>
                <dd>{fmtDayTime(slot, tz)}</dd>
              </div>
              <div>
                <dt>Длительность</dt>
                <dd>{price.durationMin}&nbsp;мин</dd>
              </div>
              <div>
                <dt>Ученик</dt>
                <dd>{student}</dd>
              </div>
              <div className="tot">
                <dt>Стоимость</dt>
                <dd data-testid="total">{fmtMoney(price.priceRub)}</dd>
              </div>
            </dl>
            {errors.form ? (
              <p className="err" role="alert">
                {errors.form}
              </p>
            ) : null}
            <span className="only-d">
              <button type="submit" className="btn p w" disabled={busy || blocked}>
                Записаться
              </button>
            </span>
            <p className="hint">Отменить без последствий можно до&nbsp;{fmtDayAt(slot - 4 * HOUR, tz)}</p>
          </section>
        </aside>
      </form>
      <div className="mbar only-m">
        <div className="stack s" style={{ gap: 0 }}>
          <span className="mut sm">Стоимость</span>
          <b>{fmtMoney(price.priceRub)}</b>
        </div>
        <button type="submit" form="book-form" className="btn p" disabled={busy || blocked}>
          Записаться
        </button>
      </div>
    </>
  );
}

