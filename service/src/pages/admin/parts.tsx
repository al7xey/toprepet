import type { LessonCase } from '../../api/admin';
import { eventText, PROBLEM_KIND } from '../../lib/admin';
import { first } from '../../lib/names';
import { fmtDayTime, MSK } from '../../lib/time';

/** The lesson history by time (mockups adminLesson, adminDispute): status changes, the problem and its decision;
    the last line in bold says what the lesson is waiting for. */
export function History({ c, at }: { c: LessonCase; at: number }) {
  const b = c.booking;
  const who = { studentId: b.studentId, studentName: b.studentName, tutorName: b.tutorName };
  const lines: { at: number; text: string }[] = c.history.map(e => ({ at: e.at, text: eventText(e, who) }));
  if (c.problem) {
    lines.push({ at: c.problem.createdAt, text: `ученик сообщил о проблеме: ${PROBLEM_KIND[c.problem.kind]?.toLowerCase() ?? 'другое'}` });
    if (c.problem.resolvedAt)
      lines.push({
        at: c.problem.resolvedAt,
        text: `${c.problem.resolvedBy ? first(c.problem.resolvedBy) : 'поддержка'}: ${c.problem.resolution === 'happened' ? 'занятие состоялось' : 'занятие не состоялось'}`,
      });
  }
  lines.sort((x, y) => x.at - y.at);
  const waiting = waitingFor(c, at);
  return (
    <section className="stack s" aria-label="История">
      <b className="h3">История</b>
      <ol className="tl">
        {lines.map((l, i) => (
          <li key={i} className="d">
            {fmtDayTime(l.at, MSK)} · {l.text}
          </li>
        ))}
        {waiting ? <li className="c">{waiting}</li> : null}
      </ol>
    </section>
  );
}

function waitingFor(c: LessonCase, at: number) {
  const b = c.booking;
  if (c.problem?.status === 'open') return 'Ждёт решения поддержки';
  if (b.status === 'pending') return 'Ждёт ответа репетитора';
  if (b.status === 'confirmed' && b.endsAt > at) return b.meetingUrl ? 'Ждём начала занятия' : 'Ждём ссылку от репетитора';
  if (b.status === 'confirmed') return 'Ждём подтверждения ученика после занятия';
  return null;
}
