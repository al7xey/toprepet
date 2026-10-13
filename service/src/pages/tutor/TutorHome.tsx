import { Link } from 'react-router-dom';
import { MISSING_LABEL, MISSING_ORDER, getTutorSummary } from '../../api/tutor';
import { useSession } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { first } from '../../lib/names';
import { countLabel } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/* Р1.1 + Р4.1-сводка, mockup tutorHome: warnings (not published, no free windows), new bookings and upcoming lessons.
   Bookings arrive in iterations 3–4; until then both lists show their empty states.
   The «no meeting link within 24 hours» warning joins with lessons in iteration 4. */
export function TutorHome() {
  usePageMeta('Сводка', { noindex: true });
  const { profile } = useSession();
  const id = profile?.id ?? '';
  const summary = useAsync(() => getTutorSummary(id), id);
  const s = summary.data;

  return (
    <>
      <h1 className="h1">Здравствуйте, {first(profile?.name ?? '')}</h1>
      {summary.loading ? (
        <Loading />
      ) : summary.error || !s ? (
        <LoadError title="Не получилось загрузить сводку" onRetry={summary.reload} />
      ) : (
        <>
          {s.status !== 'published' || !s.freeTime ? (
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
            </section>
          ) : null}

          <section className="stack" aria-labelledby="new-ttl">
            <b className="h2" id="new-ttl">
              Новые записи
            </b>
            <div className="card">
              <b>Новых записей нет</b>
              <span className="mut sm">Когда ученик запишется, запись появится здесь, и&nbsp;мы пришлём письмо.</span>
            </div>
          </section>
          <section className="stack" aria-labelledby="next-ttl">
            <b className="h2" id="next-ttl">
              Ближайшие занятия
            </b>
            <div className="card">
              <b>Ближайших занятий нет</b>
              <span className="mut sm">Здесь будут подтверждённые занятия.</span>
            </div>
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
