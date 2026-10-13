import { Link, useSearchParams } from 'react-router-dom';
import { getMail, getOutboxLetter, listDevMail } from '../../api/devmail';
import { useAsync } from '../../api/useAsync';
import { fmtDayTime, guessZone } from '../../lib/time';
import { LoadError, Loading } from '../../ui/LoadError';
import { usePageMeta } from '../../ui/meta';

/* О2 (mockups devMail, mailStatus): letters of the local stack. Auth letters (registration, password reset) come from the mail
   catcher; the service's letters (status changes, reminders, links, problems) from the email_outbox queue, rendered like the
   send-email Edge Function renders them. Development and e2e builds only. */
export function DevMail() {
  usePageMeta('Письма', { noindex: true });
  const [params] = useSearchParams();
  const id = params.get('id');
  return id ? <Letter id={id} /> : <Inbox />;
}

function Inbox() {
  const mail = useAsync(listDevMail, 'inbox');
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
        <ul className="stack" style={{ gap: 0, listStyle: 'none', margin: 0, padding: 0 }} aria-label="Письма">
          {mail.data.map(m => (
            <li key={m.key}>
              <Link className="li" to={`/dev/mail?id=${encodeURIComponent(m.key)}`}>
                <span className="ico" style={{ width: 36, height: 36 }} aria-hidden="true" />
                <span className="t">
                  <b className="ell">{m.subject}</b>
                  <span className="mut sm ell">
                    {m.to}
                    {m.queued ? ' · в очереди' : ''}
                  </span>
                </span>
                <span className="mut sm nw1">{fmtDayTime(m.at, tz)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function loadLetter(key: string) {
  if (key.startsWith('o')) {
    const l = await getOutboxLetter(Number(key.slice(1)));
    if (!l) throw new Error('no letter');
    return { subject: l.subject, to: l.to, html: l.html };
  }
  const m = await getMail(key.replace(/^m/, ''));
  return { subject: m.Subject, to: m.To.map(t => t.Address).join(', '), html: m.HTML || `<pre>${escapeHtml(m.Text)}</pre>` };
}

function Letter({ id }: { id: string }) {
  const mail = useAsync(() => loadLetter(id), id);
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
            {mail.data.subject}
          </h1>
          <span className="mut sm">Кому: {mail.data.to}</span>
          <iframe title="Текст письма" sandbox="allow-popups allow-top-navigation-by-user-activation" srcDoc={mail.data.html} />
        </article>
      )}
    </>
  );
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
