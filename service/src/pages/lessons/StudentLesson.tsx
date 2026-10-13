import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cancelBooking, getMyBooking, markOk, type Booking } from '../../api/booking';
import { useReadOnOpen } from '../../api/notifications';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { autoCompleteAt, awaitsReview, freeCancelUntil, isLateCancel, reminderTimes, shortUrl } from '../../lib/lessons';
import { fmtMoney } from '../../lib/money';
import { dative, first, genitive, instrumental, past } from '../../lib/names';
import { fmtDay, fmtDayAt, fmtDayTime, fmtRange, fmtTime, now, zoneBy, zoneCity } from '../../lib/time';
import { Facts, OtherSlots, PersonRow, participant } from '../../ui/lesson';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { Overlay } from '../../ui/Overlay';
import { StatusPill, shownStatus } from '../../ui/StatusPill';
import { NotFound } from '../common/NotFound';
import { subjectDat } from '../public/TutorPage';
import { reachGoal } from '../../app/metrika';

/** /cabinet/lessons/:id: the student's lesson card in every state (mockups lessonPending, cancelPending, lessonRejected, lessonConfirmed,
    lessonLink, cancelFree, cancelLate, cancelDone, lessonAfter, lessonDone, lessonAutoCancel, problemSent). У4.3, У5.2, У7.1, У7.3, У7.4, У7.5. */
export function StudentLesson() {
  usePageMeta('Занятие', { noindex: true });
  const { id = '' } = useParams();
  const { state } = useLocation() as { state: { toast?: string } | null };
  const [toast, setToast] = useState<string | null>(state?.toast ?? null);
  const lesson = useAsync(() => getMyBooking(Number(id)), id);
  useReadOnOpen(Number(id));

  if (lesson.loading && !lesson.data) return <Loading />;
  if (lesson.error) return <LoadError title="Не получилось загрузить занятие" onRetry={lesson.reload} />;
  if (!lesson.data) return <NotFound />;
  return (
    <Lesson
      key={lesson.data.status}
      b={lesson.data}
      toast={toast}
      onChanged={text => {
        setToast(text);
        lesson.reload();
      }}
    />
  );
}

function Lesson({ b, toast, onChanged }: { b: Booking; toast: string | null; onChanged: (toast: string | null) => void }) {
  const tz = useViewerZone();
  const { profile } = useSession();
  const navigate = useNavigate();
  const at = now();
  const name = first(b.tutorName);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otherZone = fmtTime(b.startsAt, b.tutorTz) !== fmtTime(b.startsAt, tz);
  const status = shownStatus(b, at);

  const pending = b.status === 'pending' && b.startsAt > at;
  const upcoming = b.status === 'confirmed' && b.endsAt > at;
  const cancellable = (pending || upcoming) && b.startsAt > at;
  const late = isLateCancel(b, at);
  const review = !b.problem && awaitsReview(b, at);
  const profileLink = b.tutorSlug ? `/teachers/${b.tutorSlug}/` : null;

  async function cancel() {
    setBusy(true);
    const res = await cancelBooking(b.id);
    setBusy(false);
    setDialog(false);
    if (res.ok) {
      if (b.status === 'pending') {
        void navigate('/cabinet/', { replace: true, state: { toast: `Запись отменена. ${name} получит уведомление.` } });
        return;
      }
      onChanged(`Занятие отменено. ${name} ${past(name, 'получил', 'получила')} уведомление.`);
      return;
    }
    setError(
      res.reason === 'not_cancellable'
        ? 'Это занятие уже нельзя отменить: его статус изменился. Обновите страницу.'
        : 'Не получилось отменить. Проверьте интернет и попробуйте ещё раз.',
    );
  }

  async function ok() {
    setBusy(true);
    const res = await markOk(b.id);
    setBusy(false);
    if (res.ok) {
      reachGoal('lesson_ok');
      onChanged('Спасибо! Занятие завершено.');
      return;
    }
    setError('Не получилось завершить занятие. Обновите страницу и попробуйте ещё раз.');
  }

  const facts = (
    <Facts
      rows={[
        ['Когда', fmtRange(b.startsAt, b.endsAt, tz)],
        [`У${' '}${genitive(name)}`, otherZone ? `${fmtTime(b.startsAt, b.tutorTz)}, ${zoneCity(b.tutorTz)}` : null],
        ['Ученик', participant(b, profile?.name ?? '')],
        ['Стоимость', fmtMoney(b.priceRub)],
        ['Оплата', 'репетитору напрямую'],
      ]}
    />
  );
  const tutorRow = (
    <PersonRow
      name={b.tutorName}
      sub={
        profileLink ? (
          <Link className="lnk sm" to={profileLink} style={{ justifySelf: 'start' }}>
            Открыть анкету
          </Link>
        ) : null
      }
    />
  );
  const alert = error ? (
    <p className="alert" role="alert">
      {error}
    </p>
  ) : null;
  const toastEl = toast ? <output className="toast">{toast}</output> : null;
  const head = (
    <>
      <Link className="back" to="/cabinet/">
        Мои занятия
      </Link>
      <div className="row sb">
        <h1 className="h1">{b.subjectName}</h1>
        <StatusPill status={status} />
      </div>
    </>
  );
  const moreTutors = (
    <Link className="btn s" to={`/teachers/?subject=${b.subjectSlug}`} style={{ justifySelf: 'start' }}>
      Другие репетиторы по&nbsp;{subjectDat(b.subjectSlug, b.subjectName).replace(/ языку$/, '')}
    </Link>
  );

  /* ---------- declined (lessonRejected) and cancelled automatically (lessonAutoCancel) ---------- */
  if (b.status === 'declined' || (b.status === 'cancelled' && b.cancelledBy === 'system')) {
    const declined = b.status === 'declined';
    return (
      <>
        {head}
        <PersonRow name={b.tutorName} sub={<span className="mut sm">{fmtDayTime(b.startsAt, tz)}</span>} />
        <div className="card f">
          {declined ? (
            <>
              <b>{name} не&nbsp;сможет провести занятие</b>
              <span className="mut">
                {b.declineReason ? <>Причина: «{b.declineReason}». </> : null}Выберите другое время или другого репетитора.
              </span>
            </>
          ) : (
            <>
              <b>
                {name} не&nbsp;{past(name, 'ответил', 'ответила')} вовремя
              </b>
              <span className="mut">Запись на&nbsp;{fmtDayTime(b.startsAt, tz)} отменена автоматически. Выберите другое время.</span>
            </>
          )}
        </div>
        <OtherSlots b={b} tz={tz} title={declined ? `Свободное время ${genitive(name)}` : 'Записаться на другое время'} />
        {moreTutors}
      </>
    );
  }

  /* ---------- cancelled by the student or the tutor (cancelDone) ---------- */
  if (b.status === 'cancelled') {
    const byTutor = b.cancelledBy === 'tutor';
    return (
      <>
        {head}
        {tutorRow}
        {toastEl}
        {byTutor ? (
          <div className="card f">
            <b>
              {name} {past(name, 'отменил', 'отменила')} занятие
            </b>
            <span className="mut">
              {b.cancelReason ? <>Причина: «{b.cancelReason}». </> : null}Выберите другое время.
            </span>
          </div>
        ) : null}
        {facts}
        {byTutor ? (
          <OtherSlots b={b} tz={tz} title="Записаться на другое время" />
        ) : profileLink ? (
          <Link className="btn s" to={profileLink} style={{ justifySelf: 'start' }}>
            Записаться на&nbsp;другое время
          </Link>
        ) : null}
      </>
    );
  }

  /* ---------- a problem was reported (problemSent) ---------- */
  if (b.problem) {
    const open = b.problem.status === 'open';
    return (
      <>
        {head}
        {tutorRow}
        {open ? (
          <>
            <div className="warm">
              <b>Разбираемся</b>
              <p className="sm">
                Поддержка свяжется с&nbsp;вами и&nbsp;с&nbsp;{instrumental(name)}. Ответ пришлём на&nbsp;{profile?.email} до&nbsp;
                {fmtDay(b.problem.dueAt, tz)}.
              </p>
            </div>
            <ol className="tl" aria-label="Что дальше">
              <li className="d">{fmtDayTime(b.problem.createdAt, tz)}: вы сообщили о&nbsp;проблеме</li>
              <li className="c">Поддержка проверяет занятие</li>
              <li>Решение: занятие состоялось или не&nbsp;состоялось</li>
            </ol>
          </>
        ) : (
          <div className="card f">
            <b>Решение по&nbsp;занятию</b>
            <span className="mut">
              {b.problem.resolution === 'happened' ? 'Занятие считается состоявшимся.' : 'Занятие считается несостоявшимся.'}
            </span>
          </div>
        )}
        {facts}
      </>
    );
  }

  /* ---------- ended: waiting for «всё прошло хорошо» (lessonAfter) ---------- */
  if (review) {
    const auto = autoCompleteAt(b.endsAt);
    return (
      <>
        {head}
        <div className="two">
          <div className="stack l">
            {tutorRow}
            {alert}
            <div className="warm">
              <b>Как прошло занятие?</b>
              <p className="sm">
                Если всё хорошо, ничего делать не&nbsp;нужно: {fmtDay(auto, tz)} в&nbsp;{fmtTime(auto, tz)} занятие завершится само. О&nbsp;проблеме
                можно сообщить до&nbsp;этого времени.
              </p>
              <div className="row">
                <button type="button" className="btn p" disabled={busy} onClick={() => void ok()}>
                  Всё прошло хорошо
                </button>
                <Link className="btn" to={`/cabinet/lessons/${b.id}/problem`}>
                  Сообщить о&nbsp;проблеме
                </Link>
              </div>
            </div>
            {facts}
          </div>
          <aside />
        </div>
      </>
    );
  }

  /* ---------- completed, or ended long ago (lessonDone) ---------- */
  if (b.status === 'completed' || (b.status === 'confirmed' && b.endsAt <= at)) {
    return (
      <>
        {head}
        {tutorRow}
        {toastEl}
        {facts}
        {profileLink ? (
          <Link className="btn s" to={profileLink} style={{ justifySelf: 'start' }}>
            Записаться к&nbsp;{dative(name)} ещё
          </Link>
        ) : null}
      </>
    );
  }

  /* ---------- pending (lessonPending) and confirmed (lessonConfirmed, lessonLink) ---------- */
  const reminders = reminderTimes(b.startsAt).filter(t => t > at);
  return (
    <>
      {head}
      <div className="two">
        <div className="stack l">
          {tutorRow}
          {toastEl}
          {pending ? (
            <div className="warm">
              <b>
                Ждём ответа {genitive(name)} до&nbsp;{fmtDayAt(b.confirmDeadline, tz)}
              </b>
              <p className="sm">Когда {name} подтвердит, придёт письмо. Оплата репетитору напрямую после подтверждения.</p>
            </div>
          ) : null}
          {upcoming && b.meetingUrl ? (
            <div className="warm">
              <b>
                Начало в&nbsp;{fmtTime(b.startsAt, tz)} {zoneBy(tz)}
              </b>
              <span className="sm mut">
                Ссылка на&nbsp;звонок от&nbsp;{genitive(name)}: {shortUrl(b.meetingUrl)}
              </span>
              <a className="btn p" href={b.meetingUrl} target="_blank" rel="noreferrer noopener" style={{ justifySelf: 'start' }}>
                Подключиться
              </a>
            </div>
          ) : null}
          {upcoming && !b.meetingUrl ? (
            <div className="card f">
              <b>Репетитор пришлёт ссылку перед началом</b>
              <span className="mut sm">Как только она появится, здесь будет кнопка «Подключиться», и&nbsp;мы отправим письмо.</span>
            </div>
          ) : null}
          {alert}
          {facts}
          {upcoming && reminders.length ? (
            <p className="mut sm">Напомним на&nbsp;почту и&nbsp;здесь: {reminders.map(t => fmtDayAt(t, tz)).join(' и ')}.</p>
          ) : null}
        </div>
        {cancellable ? (
          <aside className="stack">
            <button type="button" className="btn w" onClick={() => setDialog(true)} aria-haspopup="dialog">
              {pending ? 'Отменить запись' : 'Отменить занятие'}
            </button>
            <p className="hint">
              {pending
                ? `${name} получит уведомление.`
                : late
                  ? 'До начала меньше 4 часов.'
                  : `Без последствий до ${fmtDayAt(freeCancelUntil(b.startsAt), tz)}`}
            </p>
          </aside>
        ) : (
          <aside />
        )}
      </div>
      {pending ? (
        <Overlay open={dialog} onClose={() => setDialog(false)} className="dlg" label="Отменить запись?">
          <h2 className="h2">Отменить запись?</h2>
          <p>
            Заявка на&nbsp;{fmtDayTime(b.startsAt, tz)} исчезнет, {dative(name)} придёт уведомление.
          </p>
          <button type="button" className="btn p w" disabled={busy} onClick={() => void cancel()}>
            Отменить запись
          </button>
          <button type="button" className="btn w" onClick={() => setDialog(false)}>
            Не отменять
          </button>
        </Overlay>
      ) : late ? (
        <Overlay open={dialog} onClose={() => setDialog(false)} className="dlg" label="До занятия меньше 4 часов">
          <h2 className="h2">До занятия меньше 4&nbsp;часов</h2>
          <p>
            {name} {past(name, 'держал', 'держала')} для вас это время и&nbsp;вправе считать занятие состоявшимся. Если отменяете из-за форс-мажора,
            напишите {past(name, 'ему', 'ей')}.
          </p>
          <button type="button" className="btn p w" onClick={() => setDialog(false)}>
            Не отменять
          </button>
          <button type="button" className="btn w dng" disabled={busy} onClick={() => void cancel()}>
            Всё равно отменить
          </button>
        </Overlay>
      ) : (
        <Overlay open={dialog} onClose={() => setDialog(false)} className="dlg" label="Отменить занятие?">
          <h2 className="h2">Отменить занятие?</h2>
          <p>
            До начала больше 4&nbsp;часов, отмена ни&nbsp;к&nbsp;чему не&nbsp;обязывает. {name} получит письмо, время снова станет свободным.
          </p>
          <button type="button" className="btn p w" disabled={busy} onClick={() => void cancel()}>
            Отменить занятие
          </button>
          <button type="button" className="btn w" onClick={() => setDialog(false)}>
            Не отменять
          </button>
        </Overlay>
      )}
    </>
  );
}
