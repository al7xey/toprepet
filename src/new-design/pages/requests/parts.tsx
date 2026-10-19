import type { ReactNode } from 'react';
import type { RequestResponse, RequestStatus, StudyRequest } from '../../api/types';
import { ago, count, fromRub, rub, whenLabel } from '../../lib/format';
import { Button, Card, Person, Rows, Status, StudentCard } from '../../ui';

export const REQUEST_STATUS: Record<RequestStatus, { tone: 'wait' | 'ok' | 'neutral'; icon: string; text: string }> = {
  open: { tone: 'wait', icon: 'clock', text: 'Ищем репетитора' },
  booked: { tone: 'ok', icon: 'check', text: 'Записались' },
  expired: { tone: 'neutral', icon: 'clock', text: 'Срок истёк' },
  closed: { tone: 'neutral', icon: 'x', text: 'Закрыта' },
};

/** Карточка заявки: основная информация в ячейках-таблице, как в карточке записи на анкете. Одна на странице ученика, ленте заявок и кабинете репетитора. */
export function RequestCard({ request, actions, showStatus = true, forTutor }: { request: StudyRequest; actions?: ReactNode; showStatus?: boolean; forTutor?: boolean }) {
  const s = REQUEST_STATUS[request.status];
  return (
    <Card as="article" className="trk-request">
      {forTutor && <StudentCard name={request.studentName} photo={request.studentPhoto} sub={`${ago(request.createdAt)} · ${count(request.responsesCount, 'отклик', 'отклика', 'откликов')}`} />}
      <div className="trk-exrow">
        <b className="trk-request-title">{request.subject}</b>
        {showStatus && <Status tone={s.tone} icon={s.icon}>{s.text}</Status>}
      </div>
      <Rows boxed rows={[
        ['Уровень', request.level],
        ['Цель', request.goal],
        ['Удобное время', request.schedule.join(', ')],
        ['Бюджет', request.budgetMax ? `до ${rub(request.budgetMax)}` : 'Не указан'],
      ]} />
      <p className="trk-request-text">{request.description}</p>
      <div className="trk-exrow">
        {!forTutor && <span className="muted sm">{ago(request.createdAt)} · {count(request.responsesCount, 'отклик', 'отклика', 'откликов')}</span>}
        {actions && <div className="trk-actions">{actions}</div>}
      </div>
    </Card>
  );
}

/** Отклик репетитора на заявку: цена, сообщение и время, на которое можно записаться сразу. */
export function ResponseCard({ response, bookable, bookHref, chatHref }: { response: RequestResponse; bookable: boolean; bookHref: (start: string) => string; chatHref: string }) {
  return (
    <Card as="article" className="trk-request">
      <Person name={response.tutorName} photo={response.tutorPhoto} sub={response.tutorRating ? `★ ${String(response.tutorRating).replace('.', ',')}` : 'Новый репетитор'} right={<b className="tn">{fromRub(response.price)}</b>} />
      <p className="trk-request-text">{response.message}</p>
      {response.status === 'accepted' && <Status tone="ok" icon="check">Вы записались к этому репетитору</Status>}
      {response.slots.length > 0 && bookable && (
        <div className="g8">
          <span className="muted sm">Репетитор предлагает время:</span>
          <div className="trk-actions">{response.slots.map((slot) => <Button key={slot} size="s" to={bookHref(slot)}>{whenLabel(slot)}</Button>)}</div>
        </div>
      )}
      <div className="trk-actions">
        <Button size="s" to={`/teachers/${response.tutorId}/`}>Анкета</Button>
        <Button size="s" icon="chat" to={chatHref}>Написать</Button>
      </div>
    </Card>
  );
}
