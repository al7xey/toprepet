import { Link, useParams } from 'react-router-dom';
import { getLessonCase } from '../../api/admin';
import { useAsync } from '../../api/useAsync';
import { lessonNo, PROBLEM_KIND } from '../../lib/admin';
import { shortUrl } from '../../lib/lessons';
import { fmtMoney } from '../../lib/money';
import { fmtDayTime, fmtTime, MSK, now } from '../../lib/time';
import { Facts, participant } from '../../ui/lesson';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { shownStatus, StatusPill } from '../../ui/StatusPill';
import { NotFound } from '../common/NotFound';
import { History } from './parts';

/** /admin/lessons/:id (mockup adminLesson, А2): participants, time by Moscow and at the tutor, the link, the history of statuses.
    No money moves through the service in the MVP, so there are no payments or refunds here. */
export function AdminLesson() {
  const { id = '' } = useParams();
  usePageMeta(`Занятие ${lessonNo(Number(id))}`, { noindex: true });
  const c = useAsync(() => getLessonCase(Number(id)), id);
  if (c.loading) return <Loading />;
  if (c.error) return <LoadError title="Не получилось загрузить занятие" onRetry={c.reload} />;
  if (!c.data) return <NotFound />;
  const { booking: b, problem } = c.data;
  const at = now();
  const tutorTime = fmtTime(b.startsAt, b.tutorTz) !== fmtTime(b.startsAt, MSK) ? ` · ${fmtTime(b.startsAt, b.tutorTz)} у репетитора` : '';
  const cancel =
    b.status === 'cancelled'
      ? `${b.cancelledBy === 'student' ? 'ученик' : b.cancelledBy === 'tutor' ? 'репетитор' : 'автоматически'}${b.lateCancel ? ', поздняя отмена' : ''}${b.cancelReason && b.cancelReason !== 'no_answer' ? `: «${b.cancelReason}»` : ''}`
      : null;
  return (
    <>
      <Link className="back" to="/admin/lessons">
        Занятия
      </Link>
      <div className="row sb">
        <h1 className="h1">{lessonNo(b.id)}</h1>
        <StatusPill status={problem?.status === 'open' ? 'review' : shownStatus(b, at)} />
      </div>
      <div className="two">
        <div className="stack l">
          <Facts
            rows={[
              ['Когда', `${fmtDayTime(b.startsAt, MSK)} МСК${tutorTime}`],
              ['Предмет', `${b.subjectName}, ${b.durationMin} мин`],
              ['Ученик', `${participant(b, b.studentName)}${b.forOther ? ` · аккаунт ${b.studentName}` : ''}, ${b.studentEmail}`],
              ['Репетитор', b.tutorEmail ? `${b.tutorName}, ${b.tutorEmail}` : b.tutorName],
              [
                'Ссылка на звонок',
                b.meetingUrl ? (
                  <a key="url" className="lnk" href={b.meetingUrl} target="_blank" rel="noreferrer">
                    {shortUrl(b.meetingUrl)}
                  </a>
                ) : null,
              ],
              ['Отклонено', b.declineReason ? `«${b.declineReason}»` : null],
              ['Отменено', cancel],
            ]}
          />
          {problem ? (
            <div className="card f">
              <b>
                {problem.status === 'open' ? 'Проблема на рассмотрении' : 'Проблема решена'}: {PROBLEM_KIND[problem.kind] ?? 'Другое'}
              </b>
              {problem.description ? <span className="mut">{problem.description}</span> : null}
              <Link className="lnk" to={`/admin/disputes/${b.id}`}>
                {problem.status === 'open' ? 'Решить' : 'Открыть решение'}
              </Link>
            </div>
          ) : null}
          <History c={c.data} at={at} />
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
                <dd>напрямую репетитору</dd>
              </div>
            </dl>
            <a className="btn w" href={`mailto:${[b.studentEmail, b.tutorEmail].filter(Boolean).join(',')}?subject=${encodeURIComponent(`Занятие ${lessonNo(b.id)}`)}`}>
              Написать участникам
            </a>
          </section>
        </aside>
      </div>
    </>
  );
}
