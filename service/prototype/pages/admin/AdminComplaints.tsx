import { useState } from 'react';
import { Btn, Empty, Note, Seg, St } from '../../ui/kit';
import { usePhone } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, chat as chatApi, tutorById, userById } from '../../api';
import type { Complaint } from '../../api/types';
import { nb } from '../../lib/text';
import { fmtDayTime, MSK } from '../../lib/time';
import { AdminPage, Who } from './shared';

export default function AdminComplaints() {
  const d = useDb();
  const phone = usePhone();
  const { run } = useApp();
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const all = d.complaints.slice().sort((a, b) => b.createdAt - a.createdAt);
  const list = all.filter(c => c.status === tab);
  const nameOf = (id: string) => tutorById(d, id)?.name ?? userById(d, id)?.name ?? 'Пользователь';
  const card = (c: Complaint) => {
    const by = userById(d, c.byId);
    const against = tutorById(d, c.againstId) ?? userById(d, c.againstId);
    const msgs = d.messages.filter(m => m.chatId === c.chatId && m.kind === 'text').sort((a, b) => a.createdAt - b.createdAt).slice(-6);
    const repeat = d.complaints.filter(x => x.againstId === c.againstId).length;
    return (
      <div className="card" style={{ gap: 12 }} key={c.id}>
        <Who tone={against?.tone ?? 'indigo'} src={against?.photo} name={`На ${nameOf(c.againstId)}`} sub={`от ${by?.name ?? 'пользователя'} · ${fmtDayTime(c.createdAt, MSK)}`} right={c.status === 'open' ? <St tone="action" icon="flag">Новая</St> : <St icon="check">Закрыта</St>} />
        <div className="row-s"><St tone="bad" icon="warn">{c.reason}</St>{c.blocked && <St icon="lock">Автор заблокировал собеседника</St>}{repeat > 1 && <St tone="bad">{`Жалоб на него: ${repeat}`}</St>}</div>
        {msgs.length > 0 && (
          <div style={{ display: 'grid', gap: 6, background: 'var(--bg)', borderRadius: 18, padding: 10 }}>
            {msgs.map(m => <div key={m.id} className={`msg ${m.authorId === c.againstId ? 'msg--in' : 'msg--out'}`} style={{ maxWidth: '86%', ...(m.id === c.messageId ? { boxShadow: '0 0 0 2px var(--red)' } : {}) }}>{nb(m.text ?? '')}<time>{`${nameOf(m.authorId).split(' ')[0]} · ${fmtDayTime(m.createdAt, MSK)}`}</time></div>)}
          </div>
        )}
        {c.status === 'open' && <div className="r9-two"><Btn v="primary" size="m" onClick={() => run(() => chatApi.resolveComplaint(c.id), 'Жалоба закрыта')}>Разобрались</Btn></div>}
      </div>
    );
  };
  const tabs = <Seg label="Жалобы" value={tab} onChange={setTab} items={[{ value: 'open', label: `Новые · ${all.filter(c => c.status === 'open').length}` }, { value: 'resolved', label: 'Закрытые' }]} />;
  const body = list.length ? list.map(card) : <Empty icon="check" title={tab === 'open' ? 'Новых жалоб нет' : 'Закрытых пока нет'} style={{ maxWidth: 'none' }} />;
  const rules = (
    <div className="card"><span className="h3">Как разбираем</span>
      <Note icon="eye">Проверяем переписку в течение 24 часов. Автор жалобы остаётся анонимным.</Note>
      <Note icon="shield">Просьба платить вне TopRepet — предупреждение, при повторе анкету скрываем.</Note>
      <Note icon="lock">Блокировка действует сразу: заблокированный не может писать автору.</Note>
    </div>
  );
  if (phone) return <AdminPage title="Жалобы" side="Жалобы"><h1 className="h1">Жалобы</h1><div>{tabs}</div>{body}</AdminPage>;
  return (
    <AdminPage title="Жалобы" side="Жалобы">
      <div className="between"><h1 className="h1">Жалобы в чатах</h1>{tabs}</div>
      <div className="cols c2"><div className="stack">{body}</div>{rules}</div>
    </AdminPage>
  );
}
