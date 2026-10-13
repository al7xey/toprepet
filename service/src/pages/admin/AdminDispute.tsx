import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLessonCase, resolveProblem, type LessonCase } from '../../api/admin';
import { countersChanged } from '../../api/notifications';
import { useAsync } from '../../api/useAsync';
import { isOverdue, lessonNo, PROBLEM_KIND } from '../../lib/admin';
import { fmtMoney } from '../../lib/money';
import { first } from '../../lib/names';
import { fmtDay, fmtDayTime, MSK, now } from '../../lib/time';
import { TextAreaField } from '../../ui/Field';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { NotFound } from '../common/NotFound';
import { History } from './parts';

/** /admin/disputes/:bookingId (mockup adminDispute, А3): what the student wrote and the lesson history on the left,
    two decisions without money on the right (Р-5). The comment is required; the decision and the comment go to both sides by letter. */
export function AdminDispute() {
  const { id = '' } = useParams();
  usePageMeta(`Проблема по занятию ${lessonNo(Number(id))}`, { noindex: true });
  const c = useAsync(() => getLessonCase(Number(id)), id);
  if (c.loading) return <Loading />;
  if (c.error) return <LoadError title="Не получилось загрузить обращение" onRetry={c.reload} />;
  if (!c.data?.problem) return <NotFound />;
  return <Decide c={c.data} onStale={c.reload} />;
}

function Decide({ c, onStale }: { c: LessonCase; onStale: () => void }) {
  const navigate = useNavigate();
  const p = c.problem!;
  const b = c.booking;
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const at = now();
  const open = p.status === 'open';

  async function decide(resolution: 'happened' | 'not_happened') {
    if (!comment.trim()) {
      setError('Напишите комментарий: он уйдёт письмом ученику и репетитору.');
      return;
    }
    setBusy(true);
    const res = await resolveProblem(p.id, resolution, comment);
    setBusy(false);
    if (res.ok) {
      countersChanged();
      void navigate('/admin/disputes', {
        replace: true,
        state: { toast: `Решение по занятию ${lessonNo(b.id)} отправлено ученику и репетитору.` },
      });
      return;
    }
    if (res.reason === 'not_found') {
      onStale();
      return;
    }
    setError(res.reason === 'reason_required' ? 'Напишите комментарий к решению.' : 'Не получилось сохранить решение. Попробуйте ещё раз.');
  }

  return (
    <>
      <Link className="back" to="/admin/disputes">
        Проблемы
      </Link>
      <div className="row sb">
        <h1 className="h1">{lessonNo(b.id)}</h1>
        {open ? (
          <span className={`pill ${isOverdue(p.dueAt, at) ? 'bad' : 'act'}`}>
            {isOverdue(p.dueAt, at) ? 'Просрочено: ' : 'Решить до '}
            {fmtDay(p.dueAt, MSK)}
          </span>
        ) : (
          <span className="pill">Решено</span>
        )}
      </div>
      <div className="two">
        <div className="stack l">
          <div className="card f">
            <b>
              {first(b.studentName)}: «{PROBLEM_KIND[p.kind] ?? 'Другое'}»
            </b>
            {p.description ? <span className="mut">{p.description}</span> : null}
            <span className="mut sm">
              Занятие {fmtDayTime(b.startsAt, MSK)} МСК, {b.subjectName}, репетитор {b.tutorName}.{' '}
              <Link className="lnk" to={`/admin/lessons/${b.id}`}>
                Карточка занятия
              </Link>
            </span>
          </div>
          <History c={c} at={at} />
          {open ? (
            <TextAreaField
              label="Комментарий к решению"
              value={comment}
              maxLength={1000}
              onChange={e => {
                setComment(e.target.value);
                setError(null);
              }}
              error={error}
            />
          ) : (
            <div className="card f">
              <b>{p.resolution === 'happened' ? 'Занятие состоялось' : 'Занятие не состоялось'}</b>
              {p.comment ? <span className="mut">{p.comment}</span> : null}
              {p.resolvedAt ? (
                <span className="mut sm">
                  {p.resolvedBy ?? 'Поддержка'}, {fmtDayTime(p.resolvedAt, MSK)}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <aside className="sticky">
          <section className="sum" aria-label="Решение">
            <span className="ttl">Решение</span>
            <dl className="dl">
              <div>
                <dt>Стоимость</dt>
                <dd>{fmtMoney(b.priceRub)}</dd>
              </div>
              <div>
                <dt>Оплата</dt>
                <dd>напрямую, вне сервиса</dd>
              </div>
            </dl>
            {open ? (
              <>
                <button type="button" className="btn p w" disabled={busy} onClick={() => void decide('not_happened')}>
                  Занятие не&nbsp;состоялось
                </button>
                <button type="button" className="btn w" disabled={busy} onClick={() => void decide('happened')}>
                  Занятие состоялось
                </button>
                <p className="hint">Решение и&nbsp;комментарий уйдут письмом ученику и&nbsp;репетитору.</p>
              </>
            ) : null}
          </section>
        </aside>
      </div>
    </>
  );
}
