import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getMyBooking, type Booking } from '../../api/booking';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { fmtMoney } from '../../lib/money';
import { dative, first, genitive } from '../../lib/names';
import { fmtDayAt, fmtDayTime, fmtRange, fmtTime, now, zoneCity } from '../../lib/time';
import { participant } from '../../ui/lesson';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';
import { StatusPill, shownStatus } from '../../ui/StatusPill';
import { NotFound } from '../common/NotFound';

/** /cabinet/lessons/:id (mockups lessonPending, cancelPending). Confirmed, declined and later states get their cards in iteration 4. */
export function StudentLesson() {
  usePageMeta('Занятие', { noindex: true });
  const { id = '' } = useParams();
  const lesson = useAsync(() => getMyBooking(Number(id)), id);
  if (lesson.loading) return <Loading />;
  if (lesson.error) return <LoadError title="Не получилось загрузить занятие" onRetry={lesson.reload} />;
  if (!lesson.data) return <NotFound />;
  return <Lesson b={lesson.data} />;
}

function Lesson({ b }: { b: Booking }) {
  const tz = useViewerZone();
  const { profile } = useSession();
  const navigate = useNavigate();
  const name = first(b.tutorName);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = b.status === 'pending' && b.startsAt > now();
  const otherZone = fmtTime(b.startsAt, b.tutorTz) !== fmtTime(b.startsAt, tz);

  async function cancel() {
    setBusy(true);
    const res = await cancelBooking(b.id);
    setBusy(false);
    if (res.ok) {
      void navigate('/cabinet/', { replace: true, state: { toast: `Запись отменена. ${name} получит уведомление.` } });
      return;
    }
    setConfirm(false);
    setError(
      res.reason === 'not_cancellable'
        ? 'Эту запись уже нельзя отменить: её статус изменился. Обновите страницу.'
        : 'Не получилось отменить запись. Проверьте интернет и попробуйте ещё раз.',
    );
  }

  return (
    <>
      <Link className="back" to="/cabinet/">
        Мои занятия
      </Link>
      <div className="row sb">
        <h1 className="h1">{b.subjectName}</h1>
        <StatusPill status={shownStatus(b, now())} />
      </div>
      <div className="two">
        <div className="stack l">
          <div className="row nw">
            <span className="av l" aria-hidden="true">
              {name.slice(0, 1)}
            </span>
            <div className="stack s" style={{ gap: 0 }}>
              <b>{b.tutorName}</b>
              {b.tutorSlug ? (
                <Link className="lnk sm" to={`/teachers/${b.tutorSlug}/`} style={{ justifySelf: 'start' }}>
                  Открыть анкету
                </Link>
              ) : null}
            </div>
          </div>
          {pending ? (
            <div className="warm">
              <b>
                Ждём ответа {genitive(name)} до&nbsp;{fmtDayAt(b.confirmDeadline, tz)}
              </b>
              <p className="sm">Когда {name} подтвердит, придёт письмо. Оплата репетитору напрямую после подтверждения.</p>
            </div>
          ) : null}
          {error ? (
            <p className="alert" role="alert">
              {error}
            </p>
          ) : null}
          <dl className="dl">
            <div>
              <dt>Когда</dt>
              <dd>{fmtRange(b.startsAt, b.endsAt, tz)}</dd>
            </div>
            {otherZone ? (
              <div>
                <dt>У&nbsp;{genitive(name)}</dt>
                <dd>
                  {fmtTime(b.startsAt, b.tutorTz)}, {zoneCity(b.tutorTz)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Ученик</dt>
              <dd>{participant(b, profile?.name ?? '')}</dd>
            </div>
            <div>
              <dt>Стоимость</dt>
              <dd>{fmtMoney(b.priceRub)}</dd>
            </div>
            <div>
              <dt>Оплата</dt>
              <dd>репетитору напрямую</dd>
            </div>
          </dl>
        </div>
        {pending ? (
          <aside className="stack">
            <button type="button" className="btn w" onClick={() => setConfirm(true)} aria-haspopup="dialog">
              Отменить запись
            </button>
            <p className="hint">{name} получит уведомление.</p>
          </aside>
        ) : (
          <aside />
        )}
      </div>
      <Overlay open={confirm} onClose={() => setConfirm(false)} className="dlg" label="Отменить запись?">
        <h2 className="h2">Отменить запись?</h2>
        <p>
          Заявка на&nbsp;{fmtDayTime(b.startsAt, tz)} исчезнет, {dative(name)} придёт уведомление.
        </p>
        <button type="button" className="btn p w" disabled={busy} onClick={() => void cancel()}>
          Отменить запись
        </button>
        <button type="button" className="btn w" onClick={() => setConfirm(false)}>
          Не отменять
        </button>
      </Overlay>
    </>
  );
}
