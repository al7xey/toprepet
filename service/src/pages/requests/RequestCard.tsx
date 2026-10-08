import type { ReactNode } from 'react';
import { Kv, St } from '../../ui/kit';
import { useDb, requests as rq } from '../../api';
import type { LessonRequest } from '../../api/types';
import { fmtAgo } from '../../lib/time';

/* A request as tutors see it: no contacts, short name only. */
export function RequestCard({ r, match, action, footRight, showLevel }: { r: LessonRequest; match?: boolean; action?: ReactNode; footRight?: ReactNode; showLevel?: boolean }) {
  const d = useDb();
  const n = rq.responseCount(d, r.id);
  return (
    <article className="req r5-req">
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <span className="row-s"><St>{rq.subjectLabel(r)}</St><St>{r.direction}</St></span>
        {match && <St tone="ok" icon="check">Подходит вам</St>}
      </div>
      <div className="r5-rqh"><h4>{r.title}</h4><p className="r5-goal">{r.goal}</p></div>
      <Kv className="r5-kv" rows={[
        ...(showLevel ? [['Уровень', r.level] as [string, string]] : []),
        ['Бюджет', `${rq.fmtBudget(r.budget)} за 60 мин`],
        ['Формат', r.format === 'online' ? 'Онлайн' : 'Очно'],
        ['Время', rq.fmtTimes(r.times)],
        ['Частота', r.frequency],
      ]} />
      <div className="req-foot"><span>{rq.requestWho(d, r)} · {fmtAgo(r.publishedAt ?? r.createdAt)}</span>{footRight}</div>
      {action !== undefined && <div className="r5-rqa">{action}<span>откликов {n} из {r.responseLimit}</span></div>}
    </article>
  );
}
