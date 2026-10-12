import { Link, useParams } from 'react-router-dom';
import { getMyBooking } from '../../api/booking';
import { useSession, useViewerZone } from '../../api/session';
import { useAsync } from '../../api/useAsync';
import { fmtMoney } from '../../lib/money';
import { dative, first } from '../../lib/names';
import { fmtDayAt, now } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';
import { LessonSummary, participant } from '../../ui/lesson';
import { StatusPill, shownStatus } from '../../ui/StatusPill';
import { NotFound } from '../common/NotFound';

/** /book/:bookingId/done (mockup bookDone): «Заявка отправлена» and until when the tutor answers (У4.3, У5.2). */
export function BookDone() {
  usePageMeta('Заявка отправлена', { noindex: true });
  const { id = '' } = useParams();
  const tz = useViewerZone();
  const { profile } = useSession();
  const booking = useAsync(() => getMyBooking(Number(id)), id);
  if (booking.loading) return <Loading />;
  if (booking.error) return <LoadError title="Не получилось загрузить запись" onRetry={booking.reload} />;
  const b = booking.data;
  if (!b) return <NotFound />;
  const name = first(b.tutorName);
  const deadline = fmtDayAt(b.confirmDeadline, tz);
  return (
    <div className="center stack l">
      <div className="stack s">
        <span className="ico" aria-hidden="true" />
        <h1 className="h1">Заявка отправлена {dative(name)}</h1>
        <span>
          <StatusPill status={shownStatus(b, now())} />
        </span>
      </div>
      <LessonSummary
        b={b}
        tz={tz}
        rows={[
          ['Ученик', participant(b, profile?.name ?? '')],
          ['Стоимость', fmtMoney(b.priceRub)],
        ]}
      />
      <ol className="tl" aria-label="Что дальше">
        <li className="d">Заявка отправлена, время за&nbsp;вами придержано</li>
        <li className="c">
          {name} подтверждает до&nbsp;{deadline}
        </li>
        <li>После подтверждения пришлём письмо, {name} напишет, как оплатить</li>
        <li>Перед занятием {name} пришлёт ссылку на&nbsp;звонок</li>
      </ol>
      <p className="mut sm">Если {name} не&nbsp;ответит, запись отменится сама, и&nbsp;мы предложим другое время.</p>
      <div className="row">
        <Link className="btn p" to={`/cabinet/lessons/${b.id}`}>
          Открыть занятие
        </Link>
        <Link className="btn" to="/cabinet/">
          Мои занятия
        </Link>
      </div>
    </div>
  );
}
