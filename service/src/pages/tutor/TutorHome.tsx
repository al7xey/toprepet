import { Link } from 'react-router-dom';
import { listTutorBookings } from '../../api/booking';
import { MISSING_LABEL, MISSING_ORDER, getTutorSummary } from '../../api/tutor';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { timeLeft } from '../../lib/lessons';
import { fmtMoney } from '../../lib/money';
import { first } from '../../lib/names';
import { countLabel, DAY, fmtDayTime, now } from '../../lib/time';
import { pupil, TutorCard, upcomingLessons, waiting } from './parts';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/* Р1.1 + Р4.1-сводка, mockup tutorHome: warnings (not published, no free windows, no meeting link for a lesson within 24 hours),
   new bookings with the answer timer and upcoming lessons. */
export function TutorHome() {
  usePageMeta('Сводка', { noindex: true });
  const { profile } = useSession();
  const id = profile?.id ?? '';
  const tz = useViewerZone();
  const summary = useAsync(() => Promise.all([getTutorSummary(id), listTutorBookings(id)]), id);
  const s = summary.data?.[0];
  const bookings = summary.data?.[1] ?? [];
  const at = now();
  const toAnswer = waiting(bookings, at);
  const lessons = upcomingLessons(bookings, at);
  const noLink = lessons.filter(b => !b.meetingUrl && b.startsAt - at < DAY);

  return (
    <>
      <h1 className="h1">Здравствуйте, {first(profile?.name ?? '')}</h1>
      {summary.loading ? (
        <Loading />
      ) : summary.error || !s ? (
        <LoadError title="Не получилось загрузить сводку" onRetry={summary.reload} />
      ) : (
        <>
          {s.status !== 'published' || !s.freeTime || noLink.length ? (
            <section className="stack" aria-label="Предупреждения">
              {s.status !== 'published' ? (
                <div className="card f">
                  <span className="mut sm">Анкета</span>
                  <b className="h3">{s.status === 'hidden' ? 'Скрыта администратором' : 'Не опубликована'}</b>
                  {s.status === 'hidden' ? (
                    <p>Анкету скрыл администратор. Напишите в&nbsp;поддержку, чтобы вернуть её в&nbsp;каталог.</p>
                  ) : (
                    <>
                      <p>Чтобы анкета появилась в&nbsp;каталоге, нужны:</p>
                      <ul className="chk" aria-label="Что нужно для публикации">
                        {MISSING_ORDER.map(m => {
                          const done = !s.missing.includes(m);
                          return (
                            <li key={m} className={done ? 'y' : 'n'} data-done={done}>
                              {MISSING_LABEL[m]}
                              <span className="sr-only">{done ? ' — готово' : ' — не хватает'}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="hint">Анкета появится в&nbsp;каталоге сразу, без проверки.</p>
                      <Link className="btn s p" to="/tutor/profile/" style={{ justifySelf: 'start' }}>
                        {s.missing.length ? 'Заполнить анкету' : 'Опубликовать анкету'}
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
              {!s.freeTime ? (
                <div className="card f">
                  <span className="mut sm">Расписание</span>
                  <b className="h3">Нет свободных окон</b>
                  <p>
                    Ученикам не&nbsp;на&nbsp;что записаться: в&nbsp;расписании нет свободного времени на&nbsp;
                    {s.horizonWeeks === 1 ? 'ближайшую неделю' : `ближайшие ${countLabel(s.horizonWeeks, 'неделю', 'недели', 'недель')}`}. Добавьте окна в&nbsp;расписании.
                  </p>
                  <Link className="btn s" to="/tutor/schedule/" style={{ justifySelf: 'start' }}>
                    Открыть расписание
                  </Link>
                </div>
              ) : null}
              {noLink.map(b => (
                <div className="card f" key={b.id}>
                  <span className="mut sm">Занятие</span>
                  <b className="h3">Нет ссылки на&nbsp;занятие</b>
                  <p>
                    {fmtDayTime(b.startsAt, tz)}, {pupil(b)}. До&nbsp;начала меньше суток: добавьте ссылку на&nbsp;звонок, чтобы ученик подключился из&nbsp;кабинета.
                  </p>
                  <Link className="btn s p" to={`/tutor/lessons/${b.id}`} style={{ justifySelf: 'start' }}>
                    Добавить ссылку
                  </Link>
                </div>
              ))}
            </section>
          ) : null}

          <section className="stack" aria-labelledby="new-ttl">
            <div className="row sb">
              <b className="h2" id="new-ttl">
                Новые записи
              </b>
              <Link className="lnk" to="/tutor/bookings/" aria-label="Все записи">
                Все
              </Link>
            </div>
            {toAnswer.length ? (
              <ul className="stack" aria-label="Ждут ответа">
                {toAnswer.slice(0, 3).map(b => (
                  <li key={b.id}>
                    <TutorCard
                      b={b}
                      tz={tz}
                      to={`/tutor/bookings/${b.id}`}
                      what={`${pupil(b)} · ${b.subjectName}, ${b.durationMin}\u00a0мин · ${fmtMoney(b.priceRub)}`}
                      pill={{ text: `Ответьте за ${timeLeft(b.confirmDeadline, at) ?? ''}`, cls: 'act' }}
                      fresh={false}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card">
                <b>Новых записей нет</b>
                <span className="mut sm">Когда ученик запишется, запись появится здесь, и&nbsp;мы пришлём письмо.</span>
              </div>
            )}
          </section>
          <section className="stack" aria-labelledby="next-ttl">
            <div className="row sb">
              <b className="h2" id="next-ttl">
                Ближайшие занятия
              </b>
              <Link className="lnk" to="/tutor/lessons/" aria-label="Все занятия">
                Все
              </Link>
            </div>
            {lessons.length ? (
              <ul className="stack" aria-label="Подтверждённые занятия">
                {lessons.slice(0, 3).map(b => (
                  <li key={b.id}>
                    <TutorCard
                      b={b}
                      tz={tz}
                      to={`/tutor/lessons/${b.id}`}
                      what={`${pupil(b)} · ${b.subjectName}${b.meetingUrl ? '' : ' · нет ссылки'}`}
                      pill={{ text: 'Подтверждено', cls: 'ok' }}
                      fresh={false}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card">
                <b>Ближайших занятий нет</b>
                <span className="mut sm">Здесь будут подтверждённые занятия.</span>
              </div>
            )}
          </section>

          {s.status === 'published' ? (
            <div className="card f">
              <span className="mut sm">Анкета</span>
              <b>Опубликована</b>
              <Link className="lnk sm" to="/tutor/profile/" style={{ justifySelf: 'start' }}>
                Открыть анкету
              </Link>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
