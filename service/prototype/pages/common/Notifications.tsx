import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn, Empty, cx } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, students } from '../../api';
import { renderTokens } from '../../ui/domain';
import { fmtAgo } from '../../lib/time';

export default function Notifications() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { toast } = useApp();
  const list = d.notices.filter(n => n.userId === me.id).sort((a, b) => b.at - a.at);
  const unread = list.filter(n => !n.read).length;
  const readAll = () => { students.markNoticesRead(); toast('Все уведомления прочитаны', { tone: 'ok' }); };
  const body = list.length ? (
    <div style={{ display: 'grid', gap: 8 }}>
      {list.slice(0, 60).map(n => (
        <a key={n.id} href={n.to ?? '#'} className={cx('notice', !n.read && 'unread')} onClick={e => { e.preventDefault(); students.markNoticesRead([n.id]); if (n.to) navigate(n.to); }}>
          <span className={cx('r8-ic', n.tone === 'ok' && 'r8-ic--ok', n.tone === 'bad' && 'r8-ic--bad', !n.tone && 'r8-ic--mute')}><Icon name={n.icon} /></span>
          <span><b>{renderTokens(n.title, me.tz)}</b><span className="small">{renderTokens(n.text, me.tz)}</span></span>
          <time>{fmtAgo(n.at, at, me.tz)}{!n.read && <span className="badge-dot" style={{ marginLeft: 6 }} aria-label="новое" />}</time>
        </a>
      ))}
    </div>
  ) : <Empty icon="bell" title="Уведомлений пока нет" style={{ maxWidth: 'none' }}>Здесь появятся записи, подтверждения, переносы и ответы поддержки.</Empty>;
  const side = me.role === 'tutor' ? 'Уроки' : me.role === 'admin' ? 'Споры' : 'Мои уроки';
  if (phone)
    return (
      <Page title="Уведомления" back={true} right={unread ? <Btn size="s" onClick={readAll}>Прочитать</Btn> : undefined}>
        {body}
      </Page>
    );
  return (
    <Page title="Уведомления" kind="cabinet" side={side}>
      <div className="between"><div className="title-block"><h1 className="h1">Уведомления</h1><p className="sub">{unread ? `Новых: ${unread}` : 'Всё прочитано'}</p></div>{unread > 0 && <Btn onClick={readAll}>Прочитать все</Btn>}</div>
      {body}
    </Page>
  );
}
