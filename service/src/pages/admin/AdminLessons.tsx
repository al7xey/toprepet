import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listLessons, PAGE, type LessonRow } from '../../api/admin';
import { useAsync } from '../../api/useAsync';
import { dayRange, lessonNo, STATUS_FILTER } from '../../lib/admin';
import { fmtMoney } from '../../lib/money';
import { countLabel, fmtDayTime, MSK, now } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { shownStatus, StatusPill } from '../../ui/StatusPill';

/** «Миша (Ирина)»: the participant and the account that booked, as in the mockup. */
export const whoLearns = (r: { studentName: string; participantName: string | null }) =>
  r.participantName ? `${r.participantName} (${r.studentName})` : r.studentName;

/** /admin/lessons (mockup adminLessons, А2): every lesson with search by student, tutor, date, status and «Есть проблема».
    Times are Moscow time, as the column says; the filters live in the address. */
export function AdminLessons() {
  usePageMeta('Занятия', { noindex: true });
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') ?? '';
  const status = STATUS_FILTER.some(s => s.id === params.get('status')) ? (params.get('status') ?? '') : '';
  const day = params.get('day') ?? '';
  const problem = params.get('problem') === '1';
  const page = Math.max(0, Number(params.get('page')) || 0);
  const [text, setText] = useState(q);

  const key = params.toString();
  const list = useAsync(() => listLessons({ q, status, day: dayRange(day, MSK), problem }, page * PAGE), key);

  function set(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setParams(next, { replace: true });
  }

  function search(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    set('q', text.trim());
  }

  const at = now();
  return (
    <>
      <div className="row sb">
        <h1 className="h1">Занятия</h1>
        {list.data ? <span className="mut">{countLabel(list.data.total, 'запись', 'записи', 'записей')}</span> : null}
      </div>
      <form className="filt" aria-label="Поиск занятий" onSubmit={search}>
        <label className="sr-only" htmlFor="adm-q">
          Ученик или репетитор
        </label>
        <input
          id="adm-q"
          className="inp"
          type="search"
          placeholder="Ученик, репетитор или номер"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => text.trim() !== q && set('q', text.trim())}
        />
        <label className="sr-only" htmlFor="adm-day">
          Дата
        </label>
        <input id="adm-day" className="inp" type="date" value={day} onChange={e => set('day', e.target.value)} />
        <label className="sr-only" htmlFor="adm-status">
          Статус
        </label>
        <select id="adm-status" className="inp" value={status} onChange={e => set('status', e.target.value)}>
          {STATUS_FILTER.map(s => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <label className={`opt${problem ? ' on' : ''}`}>
          <input type="checkbox" checked={problem} onChange={e => set('problem', e.target.checked ? '1' : '')} />
          Есть проблема
        </label>
        <button type="submit" className="btn s">
          Найти
        </button>
      </form>
      {list.loading ? (
        <Loading />
      ) : list.error || !list.data ? (
        <LoadError title="Не получилось загрузить занятия" onRetry={list.reload} />
      ) : list.data.rows.length ? (
        <>
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Когда (МСК)</th>
                  <th scope="col">Ученик</th>
                  <th scope="col">Репетитор</th>
                  <th scope="col">Статус</th>
                  <th scope="col" className="num">
                    Стоимость
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.rows.map(r => (
                  <Row key={r.id} r={r} at={at} onOpen={() => void navigate(`/admin/lessons/${r.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={list.data.total} onPage={p => setParams(prev => {
            const next = new URLSearchParams(prev);
            if (p) next.set('page', String(p));
            else next.delete('page');
            return next;
          })} />
        </>
      ) : (
        <div className="card f">
          <b className="h3">Ничего не нашлось</b>
          <p className="mut">Проверьте имя или номер занятия, снимите дату или статус.</p>
        </div>
      )}
    </>
  );
}

function Row({ r, at, onOpen }: { r: LessonRow; at: number; onOpen: () => void }) {
  return (
    <tr className="go" onClick={onOpen}>
      <td>
        <Link to={`/admin/lessons/${r.id}`}>{lessonNo(r.id)}</Link>
      </td>
      <td>{fmtDayTime(r.startsAt, MSK)}</td>
      <td>{whoLearns(r)}</td>
      <td>{r.tutorName}</td>
      <td>
        <StatusPill status={r.problem === 'open' ? 'review' : shownStatus({ status: r.status, endsAt: r.endsAt }, at)} />
      </td>
      <td className="num">{fmtMoney(r.priceRub)}</td>
    </tr>
  );
}

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE);
  if (pages <= 1) return null;
  return (
    <nav className="row" aria-label="Страницы">
      <button type="button" className="btn s" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Назад
      </button>
      <span className="mut sm">
        {page + 1} из {pages}
      </span>
      <button type="button" className="btn s" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>
        Дальше
      </button>
    </nav>
  );
}
