import { Page } from '../../ui/layout';
import { Alert, Btn, Empty } from '../../ui/kit';
import { LessonCard, LessonRow, Person, lessonStatus } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, useSession, sel, rules, tutorById } from '../../api';
import type { Lesson } from '../../api/types';
import { fmtMoney } from '../../lib/money';
import { nb } from '../../lib/text';
import { instrumental } from '../../lib/names';
import { HOUR, fmtDayTime, fmtTime } from '../../lib/time';

export default function StudentLessons() {
  const d = useDb();
  const me = useSession()!;
  const phone = usePhone();
  const at = useNow();
  const { upcoming, past } = sel.splitLessons(sel.lessonsOf(d, me).filter(l => !(l.seriesId && l.status === 'declined')), at);
  const next = upcoming.find(l => ['upcoming', 'live'].includes(rules.phase(l, at))) ?? upcoming[0];
  const soon = next && rules.phase(next, at) === 'upcoming' && next.start - at <= HOUR ? next : null;
  const awaiting = past.filter(l => rules.phase(l, at) === 'awaiting');
  const series = d.series.filter(s => s.studentId === me.id && (s.status === 'confirmed' || s.status === 'pending'));

  const who = (l: Lesson) => tutorById(d, l.tutorId);
  const nextCard = next && (() => {
    const t = who(next)!;
    const ph = rules.phase(next, at);
    return (
      <LessonCard
        to={`/my/lessons/${next.id}`}
        when={fmtDayTime(next.start, me.tz)}
        sub={`до ${fmtTime(next.end, me.tz)}${next.participant.kind === 'child' ? ` · занимается ${next.participant.name}` : ''}`}
        status={lessonStatus(next, 'student', at)}
        person={<Person name={t.name} sub={next.kind === 'intro' ? 'Знакомство' : next.subject} tone={t.tone} src={t.photo} />}
        facts={[['clock', `${next.minutes} мин`], ['video', next.link ? 'Ссылка готова' : 'Ссылка перед уроком'], ['card', next.kind === 'intro' ? 'бесплатно' : fmtMoney(next.studentPrice - next.discount)]]}
        actions={<>{ph === 'live' && next.link ? <Btn v="primary" icon="video" to={`/my/lessons/${next.id}`}>Подключиться</Btn> : <Btn to={`/messages`}>Написать</Btn>}<Btn v="tinted" to={`/my/lessons/${next.id}`}>Открыть урок</Btn></>}
      />
    );
  })();
  const row = (l: Lesson) => {
    const t = who(l)!;
    return <LessonRow key={l.id} to={`/my/lessons/${l.id}`} tone={t.tone} src={t.photo} when={fmtDayTime(l.start, me.tz)} who={`${t.name} · ${l.kind === 'intro' ? 'знакомство' : l.subject.replace(/ язык$/, '')}`} status={<span className="row-s">{lessonStatus(l, 'student', at)}</span>} />;
  };
  const rest = upcoming.filter(l => l !== next);
  const upcomingBlock = (
    <div className="stack" style={{ gap: 12 }}>
      <h2 className="sec-h">Предстоящие</h2>
      {nextCard ?? <Empty icon="cal" title="Пока нет занятий" style={{ maxWidth: 'none' }} action={<div className="row-s" style={{ justifyContent: 'center' }}><Btn v="primary" to="/teachers">Найти репетитора</Btn><Btn to="/requests/new">Создать заявку</Btn></div>}>Они появятся здесь после записи.</Empty>}
      {rest.length > 0 && <div className="r7-list">{rest.map(row)}</div>}
      {series.length > 0 && <div className="r7-list">{series.map(s => { const t = tutorById(d, s.tutorId)!; return <LessonRow key={s.id} to={`/my/series/${s.id}`} tone={t.tone} src={t.photo} when={`Серия: ${s.count} занятий`} who={`${t.name} · ${s.subject.replace(/ язык$/, '')}`} status={<span className="row-s">{s.status === 'pending' ? <span className="st st--action">Ждёт подтверждения</span> : <span className="st st--ok">Подтверждена</span>}</span>} />; })}</div>}
    </div>
  );
  const pastBlock = (
    <div className="stack" style={{ gap: 12 }}>
      <h2 className="sec-h">Прошедшие</h2>
      {past.length ? <div className="r7-list">{past.slice(0, 30).map(row)}</div> : <p className="small">Здесь будут прошедшие уроки.</p>}
    </div>
  );
  const alerts = (
    <>
      {soon && <Alert tone="action" icon="clock" title={`Через ${Math.max(1, Math.round((soon.start - at) / 60000))} мин урок с ${instrumental(who(soon)!.name.split(' ')[0])}`} style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to={`/my/lessons/${soon.id}`}>Открыть</Btn>}>{soon.link ? 'Ссылка уже в карточке урока.' : 'Ссылка появится перед началом, пришлём её на сайт и почту.'}</Alert>}
      {awaiting.map(l => <Alert key={l.id} tone="action" icon="help" title="Урок состоялся?" style={{ maxWidth: 'none' }} action={<Btn v="white" size="s" to={`/my/lessons/${l.id}`}>Ответить</Btn>}>{nb(`${fmtDayTime(l.start, me.tz)} с ${instrumental(who(l)!.name.split(' ')[0])}. Если не ответите, урок засчитается сам через 24 часа.`)}</Alert>)}
    </>
  );
  if (phone)
    return (
      <Page title="Мои уроки" kind="cabinet" tab="Уроки">
        <h1 className="h1">Мои уроки</h1>
        {alerts}{upcomingBlock}{pastBlock}
      </Page>
    );
  return (
    <Page title="Мои уроки" kind="cabinet" side="Мои уроки">
      <h1 className="h1">Мои уроки</h1>
      {alerts}
      <div className="cols half" style={{ alignItems: 'start' }}>{upcomingBlock}{pastBlock}</div>
    </Page>
  );
}
