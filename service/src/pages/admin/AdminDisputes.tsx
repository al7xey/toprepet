import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listOpenProblems } from '../../api/admin';
import { useAsync } from '../../api/useAsync';
import { isOverdue, lessonNo, PROBLEM_KIND } from '../../lib/admin';
import { fmtMoney } from '../../lib/money';
import { fmtDay, MSK, now } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { whoLearns } from './AdminLessons';

/** /admin/disputes (mockup adminDisputes, А3): open problems by their deadline of 3 working days; overdue rows are red. */
export function AdminDisputes() {
  usePageMeta('Проблемы', { noindex: true });
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { toast?: string } | null };
  const list = useAsync(listOpenProblems, 'open');
  const at = now();
  return (
    <>
      <h1 className="h1">Проблемы</h1>
      {state?.toast ? <output className="toast">{state.toast}</output> : null}
      {list.loading ? (
        <Loading />
      ) : list.error || !list.data ? (
        <LoadError title="Не получилось загрузить обращения" onRetry={list.reload} />
      ) : list.data.length ? (
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Занятие</th>
                <th scope="col">Причина</th>
                <th scope="col">Ученик</th>
                <th scope="col">Репетитор</th>
                <th scope="col">Решить до</th>
                <th scope="col" className="num">
                  Стоимость
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.map(p => {
                const late = isOverdue(p.dueAt, at);
                return (
                  <tr key={p.problemId} className={late ? 'go hot' : 'go'} onClick={() => void navigate(`/admin/disputes/${p.bookingId}`)}>
                    <td>
                      <Link to={`/admin/disputes/${p.bookingId}`}>{lessonNo(p.bookingId)}</Link>
                    </td>
                    <td>{PROBLEM_KIND[p.kind] ?? 'Другое'}</td>
                    <td>{whoLearns(p)}</td>
                    <td>{p.tutorName}</td>
                    <td>{late ? <span className="pill bad">Просрочено: {fmtDay(p.dueAt, MSK)}</span> : fmtDay(p.dueAt, MSK)}</td>
                    <td className="num">{fmtMoney(p.priceRub)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card f">
          <b className="h3">Открытых обращений нет</b>
          <p className="mut">Когда ученик сообщит о&nbsp;проблеме с&nbsp;занятием, обращение появится здесь.</p>
        </div>
      )}
    </>
  );
}
