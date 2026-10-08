import { useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Alert, Ava, Btn, Empty, Note } from '../../ui/kit';
import { usePhone, useNow } from '../../ui/hooks';
import { useApp } from '../../ui/app-state';
import { useDb, useSession, chat, rules, tutorById } from '../../api';
import type { TutorProfile } from '../../api/types';
import { nb } from '../../lib/text';
import { genitive } from '../../lib/names';
import { countLabel, fmtDayTime, fmtTime, weekdayShort, zoned } from '../../lib/time';

export default function MyTutors() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const { run } = useApp();
  const mine = d.lessons.filter(l => l.studentId === me.id && !['declined', 'expired'].includes(l.status));
  const ids = [...new Set(mine.map(l => l.tutorId))];
  const tutors = ids.map(id => tutorById(d, id)).filter((t): t is TutorProfile => !!t);
  const card = (t: TutorProfile) => {
    const ls = mine.filter(l => l.tutorId === t.userId).sort((a, b) => a.start - b.start);
    const done = ls.filter(l => l.status === 'completed' && l.kind === 'lesson').length;
    const next = ls.find(l => rules.isUpcoming(l, at));
    const series = d.series.some(s => s.studentId === me.id && s.tutorId === t.userId && ['pending', 'confirmed'].includes(s.status));
    const subject = ls.find(l => l.kind === 'lesson')?.subject ?? t.subjects[0]?.subject ?? '';
    const last = [...ls].reverse().find(l => l.kind === 'lesson' && l.status === 'completed');
    const z = last && zoned(last.start, me.tz);
    const first = t.name.split(' ')[0];
    const openChat = () => { const c = run(() => chat.openChatWithTutor(t.userId)); if (c) navigate(`/messages/${c}`); };
    return (
      <div className="card" style={{ gap: 14 }} key={t.userId}>
        <div className="r9-who"><Ava tone={t.tone} src={t.photo} /><div><b>{t.name}</b><span>{`${subject.replace(/ язык$/, '')} · ${countLabel(done, 'урок', 'урока', 'уроков')}`}</span></div></div>
        {next ? <Note icon={next.status === 'pending' ? 'clock' : 'cal'}><span>{`Следующий: ${fmtDayTime(next.start, me.tz)}`}{next.status === 'pending' && <small style={{ display: 'block', color: 'var(--muted)', fontSize: 12.5 }}>{`Ждёт подтверждения ${genitive(first)}`}</small>}</span></Note> : <Note>Будущих уроков нет</Note>}
        {done >= 2 && !series && z && (
          <Alert tone="action" icon="repeat" title="Заниматься регулярно?" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to={`/teachers/${t.slug}/series`}>Сделать регулярно</Btn>}>
            {nb(`Вы занимались уже ${countLabel(done, 'раз', 'раза', 'раз')}. Закрепим время, например ${weekdayShort(z.weekday)} в ${fmtTime(last!.start, me.tz)}?`)}
          </Alert>
        )}
        <div className="row-s"><Btn v={next ? 'gray' : 'primary'} size="m" to={`/teachers/${t.slug}/book${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`}>Записаться</Btn><Btn size="m" onClick={openChat}>Чат</Btn><Btn size="m" v="white" to={`/teachers/${t.slug}`}>Анкета</Btn></div>
      </div>
    );
  };
  const body = tutors.length ? tutors.map(card) : <Empty icon="user" title="Пока никого" style={{ maxWidth: 'none' }} action={<Btn v="primary" to="/teachers">Найти репетитора</Btn>}>Здесь будут репетиторы, с которыми вы занимались.</Empty>;
  if (phone)
    return <Page title="Мои репетиторы" back="/account">{body}</Page>;
  return (
    <Page title="Мои репетиторы" kind="cabinet" side="Мои репетиторы">
      <div className="title-block"><h1 className="h1">Мои репетиторы</h1><p className="sub">Те, с кем вы уже занимались</p></div>
      {tutors.length ? <div className="cols half" style={{ alignItems: 'start' }}>{body}</div> : body}
    </Page>
  );
}
