import { Link, useNavigate } from 'react-router-dom';
import { Page } from '../../ui/layout';
import { Ava, Btn, Empty, Kv, StepsBar } from '../../ui/kit';
import { Icon, type IconName } from '../../ui/icons';
import { LessonCard, Person, lessonStatus } from '../../ui/domain';
import { usePhone, useNow } from '../../ui/hooks';
import { useDb, useSession, auth, sel, tutorById } from '../../api';
import { fmtMoney } from '../../lib/money';
import { fmtDayTime, fmtTime } from '../../lib/time';

export default function Cabinet() {
  const d = useDb();
  const me = useSession()!;
  const at = useNow();
  const phone = usePhone();
  const navigate = useNavigate();
  const ob = me.onboarding;
  const setupLeft = ob && !ob.done;
  const { upcoming } = sel.splitLessons(sel.lessonsOf(d, me), at);
  const next = upcoming[0];
  const unread = d.notices.filter(n => n.userId === me.id && !n.read).length;
  const first = me.name.split(' ')[0];
  const setup = setupLeft && (
    <div className="card">
      <div className="between"><b className="h3">{`Настройка: ${ob.step} из 3 шагов`}</b></div>
      <StepsBar n={ob.step} of={3} />
      <p className="sub">Расскажите, чему хотите научиться, и мы покажем подходящих преподавателей.</p>
      <Btn v="primary" to={`/start/${['for-whom', 'for-whom', 'subject', 'how'][ob.step]}`} style={{ justifySelf: 'start' }}>Продолжить настройку</Btn>
    </div>
  );
  const nextBlock = (
    <div style={{ display: 'grid', gap: 10 }}>
      <b className="h3">Ближайшие занятия</b>
      {next ? (() => {
        const t = tutorById(d, next.tutorId)!;
        return (
          <LessonCard to={`/my/lessons/${next.id}`} when={fmtDayTime(next.start, me.tz)} sub={`до ${fmtTime(next.end, me.tz)}`} status={lessonStatus(next, 'student', at)} person={<Person name={t.name} sub={next.kind === 'intro' ? 'Знакомство' : next.subject} tone={t.tone} src={t.photo} />} facts={[['clock', `${next.minutes} мин`], ['card', next.kind === 'intro' ? 'бесплатно' : fmtMoney(next.studentPrice - next.discount)]]} actions={<><Btn v="tinted" size="m" to={`/my/lessons/${next.id}`}>Открыть урок</Btn><Btn size="m" to="/my/lessons">Все уроки</Btn></>} />
        );
      })() : <Empty icon="cal" title="Пока нет занятий" style={{ maxWidth: 'none' }}>Они появятся здесь после записи.</Empty>}
      {upcoming.length > 1 && <span className="small">{`И ещё ${upcoming.length - 1} в «Моих уроках»`}</span>}
    </div>
  );
  const act = (to: string, icon: IconName, title: string, text: string) => (
    <Link key={to} className="r1-act" to={to}><span className="ic"><Icon name={icon} /></span><span className="tx"><b>{title}</b><span>{text}</span></span><Icon name="right" /></Link>
  );
  const acts = <>{act('/teachers', 'search', 'Найти репетитора', 'Каталог с фильтрами')}{act('/requests/new', 'doc', 'Создать заявку', 'Репетиторы откликнутся сами')}</>;
  const links = (
    <div className="r2-files">
      {([['heart', 'Избранное', '/me/favorites'], ['user', 'Мои репетиторы', '/account/tutors'], ['card', 'Платежи', '/account/payments'], ['star', 'Мои отзывы', '/account/reviews'], ['bell', unread ? `Уведомления · ${unread}` : 'Уведомления', '/notifications'], ['gear', 'Настройки', '/account/settings'], ['mail', 'Почта (демо)', '/mail'], ['help', 'Помощь', '/help']] as const).map(([i, l, to]) => (
        <Link key={to} className="r2-li" to={to}><Icon name={i} /><span>{l}</span><Icon name="right" /></Link>
      ))}
      <button type="button" className="r2-li" style={{ width: '100%', border: 0, background: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }} onClick={() => { auth.logout(); navigate('/'); }}><Icon name="logout" /><span>Выйти</span><Icon name="right" /></button>
    </div>
  );
  const profile = (
    <div className="card">
      <Person name={me.name} sub={me.email} tone={me.tone} src={me.photo} />
      <Kv className="r1-flat" rows={[['Аккаунт', 'Ученик'], ['Вход', me.viaYandex ? 'Яндекс ID' : 'Почта и пароль'], ...(me.children.length ? [['Дети', me.children.map(c => c.name).join(', ')] as [string, string]] : [])]} />
      <div><Btn size="s" to="/account/settings">Настройки</Btn></div>
    </div>
  );
  if (phone)
    return (
      <Page title="Профиль" kind="cabinet" tab="Профиль">
        <div className="between"><h1 className="h2">{`Здравствуйте, ${first}`}</h1><Ava tone={me.tone} src={me.photo} /></div>
        {setup}
        <div style={{ display: 'grid', gap: 10 }}>{acts}</div>
        {nextBlock}
        {links}
      </Page>
    );
  return (
    <Page title="Профиль" kind="cabinet">
      <h1 className="h1">{`Здравствуйте, ${first}`}</h1>
      <div className="cols c2">
        <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>{setup}{nextBlock}{links}</div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>{acts}{profile}</div>
      </div>
    </Page>
  );
}
