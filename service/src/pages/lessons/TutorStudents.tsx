import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Ava, Btn, Empty, Note } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, useSession, rules, findPairChat, userById } from '../../api';
import type { Lesson, User } from '../../api/types';
import { countLabel, fmtDayTime, zoneCity } from '../../lib/time';

interface Row { key: string; user?: User; name: string; subjects: string[]; done: number; next?: Lesson; chatId?: string }

export default function TutorStudents() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const rows = new Map<string, Row>();
  for (const l of d.lessons.filter(x => x.tutorId === me.id && !['declined', 'expired'].includes(x.status)).sort((a, b) => a.start - b.start)) {
    const key = `${l.studentId}:${l.participant.childId ?? 'self'}`;
    const r = rows.get(key) ?? { key, user: userById(d, l.studentId), name: l.participant.age ? `${l.participant.name}, ${l.participant.age}` : l.participant.name, subjects: [], done: 0, chatId: findPairChat(d, l.studentId, me.id)?.id };
    if (!r.subjects.includes(l.subject)) r.subjects.push(l.subject);
    if (l.status === 'completed' && l.kind === 'lesson') r.done += 1;
    if (!r.next && rules.isUpcoming(l, at)) r.next = l;
    rows.set(key, r);
  }
  const list = [...rows.values()].sort((a, b) => (a.next?.start ?? Infinity) - (b.next?.start ?? Infinity));
  const tz = me.tz;
  const lessonsLabel = (n: number) => countLabel(n, 'урок', 'урока', 'уроков');
  const chat = (r: Row, propose = false) => navigate(r.chatId ? `/messages/${r.chatId}${propose ? '?propose=1' : ''}` : '/messages');
  const who = (r: Row, sub: string) => <div className="r9-who"><Ava tone={r.user?.tone ?? 'teal'} src={r.user?.photo} /><div><b>{r.name}</b><span>{sub}</span></div></div>;
  if (!list.length)
    return (
      <Page title="Мои ученики" kind="cabinet" side="Ученики" back="/tutor/lessons">
        <Empty icon="user" title="Учеников пока нет" action={<Btn v="primary" to="/tutor/requests">Заявки учеников</Btn>}>Они появятся здесь после первой записи.</Empty>
      </Page>
    );
  if (phone)
    return (
      <Page title="Мои ученики" back="/tutor/lessons">
        {list.map(r => (
          <div className="card" style={{ gap: 12 }} key={r.key}>
            {who(r, `${lessonsLabel(r.done)} · ${r.subjects.join(', ')}`)}
            {r.next
              ? <><Note icon="cal">{`Следующий: ${fmtDayTime(r.next.start, tz)}`}</Note><div><Btn size="s" onClick={() => chat(r)}>Чат</Btn></div></>
              : <><Note tone="action">Будущих уроков нет</Note><div><Btn v="primary" size="m" onClick={() => chat(r, true)}>Предложить время</Btn></div></>}
          </div>
        ))}
        <span className="small">{`Время ваше, ${zoneCity(tz)}`}</span>
      </Page>
    );
  return (
    <Page title="Мои ученики" kind="cabinet" side="Ученики">
      <div className="title-block"><h1 className="h1">Мои ученики</h1><p className="sub">{`${countLabel(list.length, 'ученик', 'ученика', 'учеников')} · время ваше, ${zoneCity(tz)}`}</p></div>
      <div className="card" style={{ padding: '16px 12px', overflowX: 'auto' }}>
        <table className="r9-tbl">
          <thead><tr><th>Ученик</th><th>Уроков</th><th>Следующий урок</th><th /></tr></thead>
          <tbody>{list.map(r => (
            <tr key={r.key}>
              <td>{who(r, r.subjects.join(', '))}</td>
              <td><b>{r.done}</b></td>
              <td>{r.next ? <b>{fmtDayTime(r.next.start, tz)}</b> : <span className="small">нет</span>}</td>
              <td>{r.next ? <Btn size="s" onClick={() => chat(r)}>Чат</Btn> : <Btn v="primary" size="s" onClick={() => chat(r, true)}>Предложить время</Btn>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Page>
  );
}
