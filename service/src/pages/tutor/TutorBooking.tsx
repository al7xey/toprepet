import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { confirmBooking, declineBooking, getMyBooking, type Booking } from '../../api/booking';
import { useReadOnOpen } from '../../api/notifications';
import { useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { timeLeft } from '../../lib/lessons';
import { fmtMoney } from '../../lib/money';
import { dative, first, instrumental, past } from '../../lib/names';
import { fmtDayAt, fmtRange, fmtTime, now, zoneBy } from '../../lib/time';
import { TextAreaField } from '../../ui/Field';
import { Facts, PersonRow } from '../../ui/lesson';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';
import { NotFound } from '../common/NotFound';
import { pupil } from './parts';

/* Р4.1 (mockup tutorReject): reasons offered when declining. */
const REASONS = ['Это время уже занято', 'Не веду этот уровень', 'Заболел(а) или не смогу', 'Другое'];

/** /tutor/bookings/:id (mockups tutorBooking, tutorReject): everything to decide, the timer to the automatic cancel (У5.2), confirm or decline. */
export function TutorBooking() {
  usePageMeta('Новая запись', { noindex: true });
  const { id = '' } = useParams();
  const booking = useAsync(() => getMyBooking(Number(id)), id);
  useReadOnOpen(Number(id));
  if (booking.loading) return <Loading />;
  if (booking.error) return <LoadError title="Не получилось загрузить запись" onRetry={booking.reload} />;
  if (!booking.data) return <NotFound />;
  // answered or cancelled bookings live on the lesson card
  if (booking.data.status !== 'pending') return <Navigate to={`/tutor/lessons/${booking.data.id}`} replace />;
  return <Decide b={booking.data} onStale={booking.reload} />;
}

function Decide({ b, onStale }: { b: Booking; onStale: () => void }) {
  const tz = useViewerZone();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const at = now();
  const left = timeLeft(b.confirmDeadline, at);
  const student = first(b.studentName);
  const otherZone = fmtTime(b.startsAt, b.studentTz) !== fmtTime(b.startsAt, tz);

  async function confirm() {
    setBusy(true);
    const res = await confirmBooking(b.id);
    setBusy(false);
    if (res.ok) {
      void navigate(`/tutor/lessons/${b.id}`, { replace: true, state: { toast: `Запись подтверждена. ${dative(student)} ушло письмо.` } });
      return;
    }
    setError(res.reason === 'not_pending' ? 'Срок ответа прошёл или запись уже отменена. Обновите страницу.' : 'Не получилось подтвердить. Попробуйте ещё раз.');
    if (res.reason === 'not_pending') onStale();
  }

  const actions = (
    <>
      <button type="button" className="btn p w" disabled={busy || !left} onClick={() => void confirm()}>
        Подтвердить
      </button>
      <button type="button" className="btn w" disabled={busy} onClick={() => setDialog(true)} aria-haspopup="dialog">
        Отклонить
      </button>
    </>
  );

  return (
    <>
      <Link className="back" to="/tutor/bookings/">
        Записи
      </Link>
      <div className="row sb">
        <h1 className="h1">Новая запись</h1>
        <span className="pill act">{left ? `Осталось ${left}` : 'Срок ответа прошёл'}</span>
      </div>
      <div className="two">
        <div className="stack l">
          <PersonRow
            name={pupil(b)}
            sub={
              <span className="mut sm">
                {b.forOther ? `${past(student, 'Записал', 'Записала')} ${student}, ${b.studentEmail}` : b.studentEmail}
              </span>
            }
          />
          <Facts
            rows={[
              ['Когда', fmtRange(b.startsAt, b.endsAt, tz)],
              ['У ученика', otherZone ? `${fmtTime(b.startsAt, b.studentTz)} ${zoneBy(b.studentTz)}` : null],
              ['Предмет', `${b.subjectName}, ${b.durationMin} мин`],
            ]}
          />
          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : null}
          <p className="mut sm">
            {left ? <>Если не&nbsp;ответить до&nbsp;{fmtDayAt(b.confirmDeadline, tz)}, запись отменится сама. </> : <>Запись отменится автоматически. </>}
            После подтверждения договоритесь с&nbsp;{instrumental(student)} об&nbsp;оплате.
          </p>
        </div>
        <aside className="sticky">
          <section className="sum" aria-label="Занятие">
            <span className="ttl">Занятие</span>
            <dl className="dl">
              <div className="tot">
                <dt>Стоимость</dt>
                <dd>{fmtMoney(b.priceRub)}</dd>
              </div>
              <div>
                <dt>Оплата</dt>
                <dd>от&nbsp;ученика напрямую</dd>
              </div>
            </dl>
            <div className="only-d stack s">{actions}</div>
          </section>
        </aside>
      </div>
      <div className="mbar only-m">
        <div className="stack s" style={{ gap: 0 }}>
          <span className="mut sm">Стоимость</span>
          <b>{fmtMoney(b.priceRub)}</b>
        </div>
        <div className="row nw">
          <button type="button" className="btn s" disabled={busy} onClick={() => setDialog(true)} aria-haspopup="dialog">
            Отклонить
          </button>
          <button type="button" className="btn p" disabled={busy || !left} onClick={() => void confirm()}>
            Подтвердить
          </button>
        </div>
      </div>
      <Overlay open={dialog} onClose={() => setDialog(false)} className="dlg" label="Почему не получится?">
        <DeclineForm b={b} onCancel={() => setDialog(false)} onStale={onStale} />
      </Overlay>
    </>
  );
}

function DeclineForm({ b, onCancel, onStale }: { b: Booking; onCancel: () => void; onStale: () => void }) {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const student = first(b.studentName);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = choice === 'Другое' ? other.trim() : choice;
    if (!reason) {
      setError(choice === 'Другое' ? 'Напишите причину: её увидит ученик.' : 'Выберите причину.');
      return;
    }
    setBusy(true);
    const res = await declineBooking(b.id, reason);
    setBusy(false);
    if (res.ok) {
      void navigate('/tutor/bookings/', { replace: true, state: { toast: `Запись отклонена. ${dative(student)} ушло письмо с причиной.` } });
      return;
    }
    if (res.reason === 'not_pending') {
      onStale();
      return;
    }
    setError(res.reason === 'reason_required' ? 'Напишите причину: её увидит ученик.' : 'Не получилось отклонить. Попробуйте ещё раз.');
  }

  return (
    <form className="stack" onSubmit={e => void submit(e)} noValidate>
      <h2 className="h2">Почему не получится?</h2>
      <fieldset className="stack s">
        <legend className="sr-only">Причина</legend>
        <div className="opts col">
          {REASONS.map(r => (
            <label key={r} className="opt">
              <input
                type="radio"
                name="reason"
                value={r}
                checked={choice === r}
                onChange={() => {
                  setChoice(r);
                  setError(null);
                }}
              />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      {choice === 'Другое' ? (
        <TextAreaField label="Причина" value={other} maxLength={300} onChange={e => setOther(e.target.value)} />
      ) : null}
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
      <p className="hint">{dative(student)} придёт письмо с&nbsp;причиной.</p>
      <button type="submit" className="btn p w" disabled={busy}>
        Отклонить запись
      </button>
      <button type="button" className="btn w" onClick={onCancel}>
        Назад
      </button>
    </form>
  );
}
