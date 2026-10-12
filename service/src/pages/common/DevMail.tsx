import { Link, useSearchParams } from 'react-router-dom';
import { getMail, listMail } from '../../api/devmail';
import { useAsync } from '../../api/useAsync';
import { fmtDayTime, guessZone } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/* О2: letters the local stack "sent" (registration, password reset). Development and e2e builds only. */
export function DevMail() {
  usePageMeta('Письма', { noindex: true });
  const [params] = useSearchParams();
  const id = params.get('id');
  return id ? <Letter id={id} /> : <Inbox />;
}

function Inbox() {
  const mail = useAsync(listMail, 'inbox');
  const tz = guessZone();
  return (
    <>
      <div className="row sb">
        <h1 className="h1">Письма</h1>
        <button type="button" className="btn s" onClick={mail.reload}>
          Обновить
        </button>
      </div>
      {mail.loading ? (
        <Loading />
      ) : mail.error || !mail.data ? (
        <LoadError title="Не получилось загрузить письма" onRetry={mail.reload} />
      ) : mail.data.length === 0 ? (
        <p className="mut">Писем пока нет.</p>
      ) : (
        <ul className="stack" style={{ gap: 0, listStyle: 'none', margin: 0, padding: 0 }}>
          {mail.data.map(m => (
            <li key={m.ID}>
              <Link className="li" to={`/dev/mail?id=${encodeURIComponent(m.ID)}`}>
                <span className="ico" style={{ width: 36, height: 36 }} aria-hidden="true" />
                <span className="t">
                  <b className="ell">{m.Subject}</b>
                  <span className="mut sm ell">{m.To.map(t => t.Address).join(', ')}</span>
                </span>
                <span className="mut sm nw1">{fmtDayTime(Date.parse(m.Created), tz)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Letter({ id }: { id: string }) {
  const mail = useAsync(() => getMail(id), id);
  return (
    <>
      <Link className="back" to="/dev/mail">
        Все письма
      </Link>
      {mail.loading ? (
        <Loading />
      ) : mail.error || !mail.data ? (
        <LoadError title="Не получилось открыть письмо" onRetry={mail.reload} />
      ) : (
        <article className="mail">
          <h1 className="h1" style={{ fontSize: 26 }}>
            {mail.data.Subject}
          </h1>
          <span className="mut sm">Кому: {mail.data.To.map(t => t.Address).join(', ')}</span>
          <iframe title="Текст письма" sandbox="allow-popups allow-top-navigation-by-user-activation" srcDoc={mail.data.HTML || `<pre>${escapeHtml(mail.data.Text)}</pre>`} />
        </article>
      )}
    </>
  );
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
