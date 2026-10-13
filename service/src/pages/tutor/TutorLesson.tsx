import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { cancelBooking, getMyBooking, setMeetingUrl, type Booking } from '../../api/booking';
import { useReadOnOpen } from '../../api/notifications';
import { useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { autoCompleteAt, meetingUrlError, shortUrl } from '../../lib/lessons';
import { fmtMoney } from '../../lib/money';
import { dative, first, instrumental, past } from '../../lib/names';
import { fmtDay, fmtDayTime, fmtRange, fmtTime, now, zoneBy } from '../../lib/time';
import { Field, TextAreaField } from '../../ui/Field';
import { Facts } from '../../ui/lesson';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';
import { NotFound } from '../common/NotFound';
import { lessonPill, pupil, pupilFirst, subjectShort } from './parts';

/** /tutor/lessons/:id (mockups tutorLessonNoLink, tutorLesson, tutorCancel): the meeting link (Р6.1) and cancelling with a reason (Р6.2). */
export function TutorLesson() {
  usePageMeta('Занятие', { noindex: true });
  const { id = '' } = useParams();
  const { state } = useLocation() as { state: { toast?: string } | null };
  const [toast, setToast] = useState<string | null>(state?.toast ?? null);
  const lesson = useAsync(() => getMyBooking(Number(id)), id);
  useReadOnOpen(Number(id));
  if (lesson.loading && !lesson.data) return <Loading />;
  if (lesson.error) return <LoadError title="Не получилось загрузить занятие" onRetry={lesson.reload} />;
  if (!lesson.data) return <NotFound />;
  // a booking still waiting for an answer is decided on its own card
  if (lesson.data.status === 'pending') return <Navigate to={`/tutor/bookings/${lesson.data.id}`} replace />;
  return (
    <Lesson
      key={`${lesson.data.status}-${lesson.data.meetingUrl ?? ''}`}
      b={lesson.data}
      toast={toast}
      onChanged={text => {
        setToast(text);
        lesson.reload();
      }}
    />
  );
}

function Lesson({ b, toast, onChanged }: { b: Booking; toast: string | null; onChanged: (toast: string) => void }) {
  const tz = useViewerZone();
  const at = now();
  const student = first(b.studentName);
  const who = pupilFirst(b);
  const otherZone = fmtTime(b.startsAt, b.studentTz) !== fmtTime(b.startsAt, tz);
  const live = b.status === 'confirmed' && b.endsAt > at;
  const cancellable = b.status === 'confirmed' && b.startsAt > at;
  const [editing, setEditing] = useState(live && !b.meetingUrl);
  const [dialog, setDialog] = useState(false);
  const pill = lessonPill(b, at);

  return (
    <>
      <Link className="back" to={b.status === 'declined' || b.cancelledBy === 'system' ? '/tutor/bookings/?tab=declined' : '/tutor/lessons/'}>
        {b.status === 'declined' || b.cancelledBy === 'system' ? 'Записи' : 'Занятия'}
      </Link>
      <div className="row sb">
        <h1 className="h1">
          {who}, {subjectShort(b.subjectName)}
        </h1>
        <span className={`pill ${pill.cls}`}>{pill.text}</span>
      </div>
      {toast ? <output className="toast">{toast}</output> : null}
      <div className="two">
        <div className="stack l">
          <Status b={b} at={at} tz={tz} />
          <Facts
            rows={[
              ['Когда', fmtRange(b.startsAt, b.endsAt, tz)],
              ['У ученика', otherZone ? `${fmtTime(b.startsAt, b.studentTz)} ${zoneBy(b.studentTz)}` : null],
              ['Ученик', b.forOther ? `${pupil(b)}, ${past(student, 'записал', 'записала')} ${student}` : pupil(b)],
              ['Предмет', `${b.subjectName}, ${b.durationMin} мин`],
              ['Стоимость', fmtMoney(b.priceRub)],
              [
                'Ссылка',
                b.meetingUrl && !editing ? (
                  <a key="link" className="lnk" href={b.meetingUrl} target="_blank" rel="noreferrer noopener">
                    {shortUrl(b.meetingUrl)}
                  </a>
                ) : null,
              ],
            ]}
          />
          {live && editing ? (
            <LinkForm
              b={b}
              onSaved={() => {
                setEditing(false);
                onChanged(`Ссылка сохранена, ${dative(student)} ушло письмо.`);
              }}
              onCancel={b.meetingUrl ? () => setEditing(false) : undefined}
            />
          ) : null}
          {live && !editing ? (
            <div className="row">
              <button type="button" className="btn s" onClick={() => setEditing(true)}>
                Изменить ссылку
              </button>
            </div>
          ) : null}
        </div>
        {cancellable ? (
          <aside className="stack">
            <button type="button" className="btn w" onClick={() => setDialog(true)} aria-haspopup="dialog">
              Отменить занятие
            </button>
            <p className="hint">{dative(student)} придёт письмо с&nbsp;вашей причиной.</p>
          </aside>
        ) : (
          <aside />
        )}
      </div>
      <Overlay open={dialog} onClose={() => setDialog(false)} className="dlg" label={`Отменить занятие с ${instrumental(who)}?`}>
        <CancelForm b={b} onClose={() => setDialog(false)} onDone={() => onChanged(`Занятие отменено. ${dative(student)} ушло письмо.`)} />
      </Overlay>
    </>
  );
}

/** What happened to the lesson, when it is no longer simply upcoming. */
function Status({ b, at, tz }: { b: Booking; at: number; tz: string }) {
  const student = first(b.studentName);
  if (b.status === 'declined')
    return (
      <div className="card f">
        <b>Вы отклонили запись</b>
        {b.declineReason ? <span className="mut">Причина: «{b.declineReason}»</span> : null}
      </div>
    );
  if (b.status === 'cancelled')
    return (
      <div className="card f">
        <b>
          {b.cancelledBy === 'system'
            ? 'Запись отменена: вы не ответили вовремя'
            : b.cancelledBy === 'tutor'
              ? 'Вы отменили занятие'
              : `${student} ${past(student, 'отменил', 'отменила')} занятие`}
        </b>
        {b.cancelledBy === 'student' && b.lateCancel ? (
          <span className="mut">Отмена меньше чем за&nbsp;4&nbsp;часа: вы вправе считать занятие состоявшимся.</span>
        ) : b.cancelledBy === 'tutor' && b.cancelReason ? (
          <span className="mut">Причина: «{b.cancelReason}»</span>
        ) : (
          <span className="mut">Время снова свободно для записи.</span>
        )}
      </div>
    );
  if (b.problem?.status === 'open')
    return (
      <div className="warm">
        <b>Ученик сообщил о&nbsp;проблеме</b>
        <p className="sm">Администратор разберёт обращение до&nbsp;{fmtDay(b.problem.dueAt, tz)} и&nbsp;напишет вам и&nbsp;ученику.</p>
      </div>
    );
  if (b.status === 'confirmed' && b.endsAt <= at)
    return (
      <div className="card f">
        <b>Занятие прошло</b>
        <span className="mut">
          {at < autoCompleteAt(b.endsAt)
            ? `Ученик может сообщить о проблеме до ${fmtDayTime(autoCompleteAt(b.endsAt), tz)}, потом занятие завершится само.`
            : 'Занятие завершится автоматически.'}
        </span>
      </div>
    );
  if (b.status === 'confirmed' && b.startsAt <= at)
    return (
      <div className="card f">
        <b>Занятие идёт</b>
      </div>
    );
  return null;
}

function LinkForm({ b, onSaved, onCancel }: { b: Booking; onSaved: () => void; onCancel?: () => void }) {
  const [url, setUrl] = useState(b.meetingUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const bad = meetingUrlError(url);
    if (bad) {
      setError(bad);
      return;
    }
    setBusy(true);
    const res = await setMeetingUrl(b.id, url);
    setBusy(false);
    if (res.ok) {
      onSaved();
      return;
    }
    setError(
      res.reason === 'bad_url'
        ? 'Ссылка должна начинаться с http:// или https://.'
        : res.reason === 'not_confirmed'
          ? 'Занятие уже закончилось или отменено. Обновите страницу.'
          : 'Не получилось сохранить ссылку. Попробуйте ещё раз.',
    );
  }

  return (
    <form className="stack s" onSubmit={e => void submit(e)} noValidate>
      <Field
        label="Ссылка на звонок"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder="https://telemost.yandex.ru/j/…"
        value={url}
        error={error}
        onChange={e => {
          setUrl(e.target.value);
          setError(null);
        }}
        hint="Ученик увидит кнопку «Подключиться» и получит письмо."
      />
      <div className="row">
        <button type="submit" className="btn p" disabled={busy}>
          Сохранить ссылку
        </button>
        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel}>
            Не менять
          </button>
        ) : null}
      </div>
    </form>
  );
}

function CancelForm({ b, onClose, onDone }: { b: Booking; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const student = first(b.studentName);

  async function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Напишите причину: её увидит ученик.');
      return;
    }
    setBusy(true);
    const res = await cancelBooking(b.id, reason);
    setBusy(false);
    if (res.ok) {
      onClose();
      onDone();
      return;
    }
    setError(
      res.reason === 'not_cancellable'
        ? 'Это занятие уже нельзя отменить: оно началось или его статус изменился.'
        : res.reason === 'reason_required'
          ? 'Напишите причину: её увидит ученик.'
          : 'Не получилось отменить. Попробуйте ещё раз.',
    );
  }

  return (
    <form className="stack" onSubmit={e => void submit(e)} noValidate>
      <h2 className="h2">Отменить занятие с&nbsp;{instrumental(pupilFirst(b))}?</h2>
      <p>
        {dative(student)} придёт письмо с&nbsp;вашей причиной и&nbsp;предложением выбрать другое время.
      </p>
      <TextAreaField label="Причина" value={reason} maxLength={300} error={error} onChange={e => setReason(e.target.value)} />
      <button type="submit" className="btn p w" disabled={busy}>
        Отменить занятие
      </button>
      <button type="button" className="btn w" onClick={onClose}>
        Не отменять
      </button>
    </form>
  );
}
