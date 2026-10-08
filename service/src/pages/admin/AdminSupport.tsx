import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ava, Btn, Empty } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, chat as chatApi, lessonById, tutorById, userById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { fmtChatTime, fmtDayTime } from '../../lib/time';
import { Composer, Thread, preview } from '../chat/thread';
import { AdminPage } from './shared';

export default function AdminSupport() {
  const { chatId } = useParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const { run } = useApp();
  const [text, setText] = useState('');
  const chats = chatApi.myChats(d, me);
  const cur = chats.find(c => c.id === chatId) ?? (phone ? undefined : chats[0]);
  const messages = useMemo(() => (cur ? d.messages.filter(m => m.chatId === cur.id).sort((a, b) => a.createdAt - b.createdAt) : []), [d, cur]);
  useEffect(() => {
    if (cur && messages.length) chatApi.markRead(cur.id);
  }, [cur?.id, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setText(''), [cur?.id]);
  const listEl = (
    <div className="r6-list" style={phone ? { padding: 8 } : undefined}>
      {chats.map(c => {
        const u = userById(d, c.userId);
        const last = [...d.messages].reverse().find(m => m.chatId === c.id);
        const unread = chatApi.unreadIn(d, c.id, me);
        return (
          <Link key={c.id} className="r6-ci" to={`/admin/support/${c.id}`} aria-current={cur?.id === c.id ? 'true' : undefined}>
            <Ava tone={u?.tone ?? 'teal'} src={u?.photo} />
            <span className="t"><b>{u?.name ?? 'Пользователь'}</b><span className={unread ? 'unr' : undefined}>{preview(last, me, false)}</span></span>
            <span className="r">{last ? fmtChatTime(last.createdAt, me.tz) : ''}{unread ? <span className="nv-badge">{unread}</span> : null}</span>
          </Link>
        );
      })}
      {!chats.length && <p className="small" style={{ padding: 12 }}>Обращений пока нет</p>}
    </div>
  );
  const pane = cur && (() => {
    const u = userById(d, cur.userId);
    const l = cur.lessonId ? lessonById(d, cur.lessonId) : undefined;
    const t = l && tutorById(d, l.tutorId);
    const dp = l?.disputeId;
    return (
      <section className="r6-pane">
        <div className="r6-head">
          <div className="r6-who"><Ava tone={u?.tone ?? 'teal'} src={u?.photo} /><div><b>{u?.name ?? 'Пользователь'}</b><span>{`${u?.role === 'tutor' ? 'Репетитор' : 'Ученик'} · ${u?.email ?? ''}`}</span></div></div>
          {dp && <Btn size="s" to={`/admin/disputes/${dp}`}>Спор</Btn>}
        </div>
        {l && <div style={{ padding: '10px 14px 0' }}><div className="r8-ctx"><Icon name="cal" /><div><b>{`Урок ${fmtDayTime(l.start, me.tz)}`}</b><span>{`${l.participant.name} → ${t?.name ?? ''} · ${fmtMoney(l.studentPrice - l.discount)} · ${l.status}`}</span></div></div></div>}
        <div className="r6-body"><Thread d={d} chat={cur} messages={messages} me={me} /></div>
        <div className="r6-cbar"><Composer value={text} setValue={setText} warnContacts={false} placeholder="Ответ от поддержки…" onSend={body => !!run(() => chatApi.sendMessage(cur.id, { text: body }))} onFile={f => run(() => chatApi.sendMessage(cur.id, { file: f }))} /></div>
      </section>
    );
  })();
  if (phone)
    return (
      <AdminPage title="Поддержка" side="Поддержка" back={cur ? '/admin/support' : undefined}>
        {cur ? <div className="r6" style={{ height: 'calc(100dvh - 90px)', display: 'grid' }}>{pane}</div> : <><h1 className="h1">Поддержка</h1>{listEl}</>}
      </AdminPage>
    );
  return (
    <AdminPage title="Поддержка" side="Поддержка">
      <h1 className="h1">Поддержка</h1>
      <div className="r6-msgr msgr">{listEl}{pane ?? <section className="r6-pane" style={{ display: 'grid', placeItems: 'center' }}><Empty icon="chat" title="Обращений пока нет" style={{ boxShadow: 'none' }} /></section>}</div>
    </AdminPage>
  );
}
