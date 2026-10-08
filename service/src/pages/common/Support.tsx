import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Btn } from '../../ui/kit';
import { Icon } from '../../ui/icons';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, chat as chatApi, lessonById, tutorById, userById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { fmtDayTime } from '../../lib/time';
import { Composer, Thread } from '../chat/thread';

export const FAQ_SHORT = ['Когда списываются деньги?', 'Как оспорить урок?', 'Куда приходит возврат?'];

export default function Support() {
  const [sp] = useSearchParams();
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const { run } = useApp();
  const [text, setText] = useState('');
  const c = d.chats.find(x => x.kind === 'support' && x.userId === me.id);
  const lessonParam = sp.get('lesson') ?? undefined;
  useEffect(() => {
    if (me.role === 'admin') return;
    if (!c || (lessonParam && c.lessonId !== lessonParam)) chatApi.openSupport(lessonParam);
  }, [c?.id, lessonParam]); // eslint-disable-line react-hooks/exhaustive-deps
  const messages = useMemo(() => (c ? d.messages.filter(m => m.chatId === c.id).sort((a, b) => a.createdAt - b.createdAt) : []), [d, c]);
  useEffect(() => {
    if (c && messages.length) chatApi.markRead(c.id);
  }, [c?.id, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (me.role === 'admin') return <Navigate to="/admin/support" replace />;
  const l = c?.lessonId ? lessonById(d, c.lessonId) : undefined;
  const other = l && (me.role === 'tutor' ? userById(d, l.studentId)?.name : tutorById(d, l.tutorId)?.name);
  const dp = l?.disputeId;
  const ctx = l && (
    <div className="r8-ctx">
      <Icon name="cal" />
      <div><b>{`Урок ${fmtDayTime(l.start, me.tz)}`}</b><span>{`${other ?? ''} · ${fmtMoney(me.role === 'tutor' ? l.tutorPrice : l.studentPrice - l.discount)}`}</span></div>
      {dp ? <Btn size="s" to={me.role === 'tutor' ? `/tutor/disputes/${dp}` : `/disputes/${dp}`}>Спор</Btn> : <Btn size="s" to={me.role === 'tutor' ? `/tutor/lessons/${l.id}` : `/my/lessons/${l.id}`}>Урок</Btn>}
    </div>
  );
  const send = (body: string) => !!c && !!run(() => chatApi.sendMessage(c.id, { text: body }));
  const sendFile = (f: { name: string; size: number; type: string; dataUrl?: string }) => c && run(() => chatApi.sendMessage(c.id, { file: f }));
  const thread = c && <div className="r8-thread" style={{ display: 'grid' }}><Thread d={d} chat={c} messages={messages} me={me} /></div>;
  const composer = <Composer glass={phone} value={text} setValue={setText} onSend={send} onFile={sendFile} warnContacts={false} />;
  if (phone)
    return (
      <Page title="Поддержка" back="/help" bottom={<div style={{ width: '100%', maxWidth: 520, display: 'grid', gap: 8 }}>{composer}</div>}>
        {ctx}
        {thread}
      </Page>
    );
  return (
    <Page title="Поддержка" kind="cabinet" side="Помощь">
      <div className="cols c2">
        <div className="card" style={{ gap: 16, padding: 22 }}>
          <div className="r8-chathead"><span className="r8-logo"><Icon name="logo" /></span><div><b className="h3">Поддержка TopRepet</b><span>Отвечаем обычно за 10 минут</span></div></div>
          {ctx}
          <div className="divider" />
          <div style={{ maxHeight: 'calc(100dvh - 380px)', minHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>{thread}</div>
          {composer}
        </div>
        <div className="card">
          <span className="h3">Частые вопросы</span>
          <div className="r8-out">{FAQ_SHORT.map(q => <div key={q}>{q}</div>)}</div>
          <div><Btn size="s" to="/help">Все вопросы</Btn></div>
        </div>
      </div>
    </Page>
  );
}
