import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Empty, IBtn } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useDb, useSession } from '../../api';
import type { Email } from '../../api/types';
import { nb } from '../../lib/text';
import { fmtChatTime, fmtDayTime } from '../../lib/time';

/* Demo mailbox: every letter the service «sent» is kept in db.emails, so the flows can be checked without a real mail server. */
export default function Mail() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const all = d.emails.filter(e => e.to === me.id).sort((a, b) => b.at - a.at);
  const list = all.filter(e => !q.trim() || `${e.subject} ${e.body}`.toLowerCase().includes(q.trim().toLowerCase()));
  const cur = all.find(e => e.id === sp.get('id')) ?? (phone ? undefined : list[0]);
  const settings = me.role === 'admin' ? '/admin/disputes' : '/account/settings';
  const letter = (e: Email) => (
    <>
      <div className="r6-mhead">
        <h2>{e.subject}</h2>
        <div className="r6-from"><span className="lg"><Icon name="logo" /></span><div><b>TopRepet</b><span>{`noreply@toprepet.ru → ${e.email}`}</span></div><time>{fmtDayTime(e.at, me.tz)}</time></div>
      </div>
      <div className="r6-mbody">
        <article className="r6-letter">
          <span className="nv-logo"><Icon name="logo" />toprepet</span>
          <h1>{e.title}</h1>
          {e.quote && <div className="msg msg--in">{nb(e.quote.text)}<time>{e.quote.time}</time></div>}
          <p>{nb(e.body)}</p>
          {e.action && <Btn v="primary" block to={e.action.to}>{e.action.label}</Btn>}
          <div className="divider" />
          <div className="r6-lfoot">
            <span>{e.reason ?? 'Письмо пришло, потому что у вас аккаунт в TopRepet. Отключить письма можно в настройках.'}</span>
            <Btn size="s" to={settings}>Настройки уведомлений</Btn>
            <span>TopRepet · подбор репетиторов онлайн</span>
          </div>
        </article>
      </div>
    </>
  );
  const items = list.length ? (
    <div className="mail-list">
      {list.map(e => (
        <Link key={e.id} className="mail-item" to={`/mail?id=${e.id}`} aria-current={cur?.id === e.id ? 'true' : undefined}>
          <span className="r6-from" style={{ display: 'contents' }}><span className="lg" style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', color: 'var(--accent)' }}><Icon name="logo" /></span></span>
          <span style={{ minWidth: 0 }}><b>{e.subject}</b><span>{e.title}</span></span>
          <time>{fmtChatTime(e.at, me.tz)}</time>
        </Link>
      ))}
    </div>
  ) : phone ? <Empty icon="mail" title={q ? 'Ничего не нашли' : 'Писем пока нет'} style={{ maxWidth: 'none' }}>Сюда попадают письма, которые сервис отправляет на вашу почту.</Empty> : <p className="small" style={{ padding: 12 }}>{q ? 'Ничего не нашли' : 'Писем пока нет'}</p>;
  if (phone) {
    if (cur)
      return (
        <Page title={cur.subject} kind="bare" hideTabs>
          <div className="r6-mphone">
            <div className="r6-mbar" style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}><a href="/mail" onClick={e => { e.preventDefault(); setSp({}); }}><Icon name="left" />Входящие</a><IBtn icon="x" label="Закрыть" to="/mail" /></div>
            {letter(cur)}
          </div>
        </Page>
      );
    return (
      <Page title="Почта" back={true} mTitle="Почта (демо)">
        <p className="sub">{`Письма на ${me.email}. Это демо-почта: настоящие письма придут, когда подключим почтовый сервис.`}</p>
        {items}
      </Page>
    );
  }
  return (
    <Page title="Почта" wide>
      <div className="desk" style={{ boxShadow: '0 0 0 .5px var(--sep), 0 24px 60px rgb(0 0 0 / 8%)' }}>
        <div className="r6-mail" style={{ gridTemplateColumns: '320px minmax(0, 1fr)', minHeight: 640 }}>
          <aside className="r6-mside">
            <span className="small" style={{ padding: '4px 12px 10px' }}>{me.email}</span>
            <a href="/mail" aria-current="page" onClick={e => e.preventDefault()}><Icon name="inbox" />Входящие{all.length ? <em>{all.length}</em> : null}</a>
            <div style={{ marginTop: 12, padding: '0 4px' }}>{items}</div>
          </aside>
          <div className="r6-mmain">
            <div className="r6-mtop"><label className="r6-msearch"><Icon name="search" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по почте" aria-label="Поиск по почте" style={{ border: 0, background: 'none', outline: 0, font: 'inherit', flex: 1, minWidth: 0 }} /></label><span className="small" style={{ marginLeft: 'auto' }}>Демо-почта сервиса</span></div>
            {cur ? letter(cur) : <div style={{ padding: 40, display: 'grid', placeItems: 'center' }}><Empty icon="mail" title="Писем пока нет" style={{ boxShadow: 'none' }}>Сюда попадают письма, которые сервис отправляет на вашу почту.</Empty></div>}
          </div>
        </div>
      </div>
    </Page>
  );
}
