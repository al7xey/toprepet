import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, LESSON_MINUTES, staticTutors, type Tutor } from '../../api';
import { trackGoal } from '../../../shared/lib/analytics';
import { TutorMetadata } from '../../../app/tutor-metadata';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { minutes, rub } from '../../lib/format';
import { BackLink, Button, ErrorState, Icon, IconButton, LoadingList, Note, PageHeader, Section, SelectField, SlotPicker, Status, Tags } from '../../ui';
import { NotFoundBody } from './notfound';
import './profile.css';
import { achievementIcon } from '../../ui/icon';


/** Анкета репетитора: данные, календарь записи, цены, отзывы. Карточка записи справа (на телефоне — панель снизу). */
export default function ProfilePage() {
  const { id = '' } = useParams();
  const initial = useMemo(() => staticTutors().find((t) => t.id === id), [id]);
  const tutorQuery = useQuery(`tutor-${id}`, () => api.getTutor(id), initial);
  const tutor = tutorQuery.data;
  if (tutorQuery.status === 404 || (!tutor && !tutorQuery.loading && !tutorQuery.error)) {
    return <PublicLayout tight><TutorMetadata tutor={null} /><NotFoundBody title="Анкета не найдена" text="Возможно, ссылка устарела или анкета снята с публикации." action={<Button to="/teachers" size="lg">К преподавателям</Button>} /></PublicLayout>;
  }
  if (tutorQuery.error) return <PublicLayout tight><PageHeader title="Анкета преподавателя" /><ErrorState text={tutorQuery.error} onRetry={tutorQuery.reload} /></PublicLayout>;
  if (!tutor) return <PublicLayout tight><PageHeader title="Анкета преподавателя" /><LoadingList rows={3} /></PublicLayout>;
  return <Profile key={id} tutor={tutor} />;
}

function Profile({ tutor }: { tutor: Tutor }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const lessonMinutes = tutor.durations?.includes(LESSON_MINUTES) ? LESSON_MINUTES : tutor.durations?.[0] ?? LESSON_MINUTES;
  const lessonPrice = Math.round(tutor.studentPrice * lessonMinutes / 60);
  const [start, setStart] = useState<string | null>(null);
  const [subject, setSubject] = useState(tutor.subjects[0] ?? '');
  const kind = subject === '__intro__' && tutor.introMinutes > 0 ? 'intro' : 'regular';
  const duration = kind === 'intro' ? tutor.introMinutes : lessonMinutes;
  const price = kind === 'intro' ? 0 : lessonPrice;
  const subjects = [
    ...tutor.subjects.map((value) => ({ value, label: value })),
    ...(tutor.introMinutes > 0 ? [{ value: '__intro__', label: 'Бесплатное знакомство' }] : []),
  ];
  const from = useMemo(() => new Date().toISOString(), []);
  const slots = useQuery(`slots-${tutor.id}-${duration}`, () => api.getTutorSlots(tutor.id, from, 14, duration));
  const isTutorAccount = user?.role === 'tutor' || user?.role === 'admin';
  const location = useLocation();
  const fromChat = (location.state as { back?: string } | null)?.back;
  // назад — по истории, если она есть; иначе к каталогу
  const close = () => { if (location.key !== 'default') void navigate(-1); else void navigate('/teachers'); };
  const share = () => {
    const url = window.location.href;
    if (navigator.share) void navigator.share({ title: tutor.name, url }).catch(() => undefined);
    else void navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  const bookHref = `/book/${tutor.id}?kind=${kind}&subject=${encodeURIComponent(kind === 'intro' ? tutor.subjects[0] ?? '' : subject)}${start ? `&start=${encodeURIComponent(start)}` : ''}`;
  const write = () => navigate(`/me/chats/new?tutor=${tutor.id}`);


  const booking = (
    <div className="trh-sec trh-pf-booking">
      <SelectField label="Предмет" value={subject} onChange={(event) => { const next = event.target.value; if ((next === '__intro__') !== (kind === 'intro')) setStart(null); setSubject(next); }} options={subjects} />
      <div className="fr fb"><span>{kind === 'intro' ? `Знакомство, ${minutes(duration)}` : `Занятие, ${minutes(duration)}`}</span><b className="tn trk-price-xl">{kind === 'intro' ? 'Бесплатно' : rub(price)}</b></div>
      {isTutorAccount ? <Note tone="plain">Записываться могут ученики. Войдите в аккаунт ученика.</Note> : (
        <div className="trh-pf-actions">
          <Button to={bookHref} size="lg" block disabled={!start} onClick={() => trackGoal('book_start', { kind })}>Записаться</Button>
          <Button variant="line" size="lg" block onClick={write}>Написать</Button>
        </div>
      )}
    </div>
  );

  return (
    <PublicLayout tight bareMobile>
      <TutorMetadata tutor={tutor} />
      <div className="trh-pf-backwrap"><BackLink to={fromChat ?? '/teachers'}>{fromChat && /^\/(me|tutor)\/chats/.test(fromChat) ? 'К сообщениям' : 'Все преподаватели'}</BackLink></div>
      <div className="trh-pf">
        <div className="trh-pf-main">
          <section className="trh-pf-top" aria-labelledby="tutor-name">
            <div className="trh-pf-photo">
              <img src={tutor.photo} srcSet={tutor.photoSrcSet} sizes="(min-width: 761px) 300px, 100vw" alt={`Фото: ${tutor.name}`} fetchPriority="high" decoding="async" />
              <IconButton icon="back" label="Назад" onClick={close} className="trh-pf-back" />
              <IconButton icon="share" label="Поделиться" onClick={share} className="trh-pf-share" />
            </div>
            <div className="trh-pf-sheet">
              <div className="trh-sec">
                <h1 className="trh-h1" id="tutor-name">{tutor.name}</h1>
                <p className="muted trh-pf-role">{tutor.headline}</p>
                <div className="fr fw u-gap8">
                  {tutor.documentsVerified && <Status tone="ok" icon="shield">Документы проверены</Status>}
                  {tutor.introMinutes > 0 && <span className="trh-pf-intro-tag"><Icon name="gift" />Бесплатное знакомство</span>}
                </div>
              </div>
              <p className="trh-pf-intro">{tutor.intro}</p>
            </div>
          </section>

          <hr className="rule" />
          <Section title="Образование и достижения">
            <ul className="ach">
              {tutor.achievements.filter((item) => item.title.trim() || item.text.trim()).map((item) => (
                <li key={item.title}>
                  <span className="trh-pf-ach-icon"><Icon name={achievementIcon(item.title)} /></span>
                  <div>{item.title.trim() && <b>{item.title}</b>}{item.text.trim() && <span className="d">{item.text}</span>}</div>
                </li>
              ))}
            </ul>
          </Section>

          <hr className="rule" />
          <Section title="Опыт"><div><Tags items={[tutor.experience]} /></div></Section>

          <hr className="rule" />
          <Section title="С чем поможет"><div><Tags items={tutor.helpTopics} /></div></Section>

          <hr className="rule" />
          <Section title="Как проходят занятия"><p className="cap trh-pf-text">{tutor.approach}</p></Section>

          <hr className="rule" />
          <Section title="Цены">
            <div>
              {tutor.introMinutes > 0 && <div className="rowline"><span><b>Знакомство</b><br /><span className="muted">{minutes(tutor.introMinutes)}, один раз</span></span><b className="u-ok">бесплатно</b></div>}
              <div className="rowline"><span><b>Занятие</b><br /><span className="muted">{minutes(lessonMinutes)}</span></span><b className="tn">{rub(lessonPrice)}</b></div>
            </div>
          </Section>

          <hr className="rule" />
          <div className="trh-pf-scheduling">
            <div className="trh-pf-calendar">
              <Section title="Свободное время">
                <span className="sm trk-tz"><Icon name="globe" />Москва · МСК (UTC+3)</span>
                {slots.error ? <Note tone="bad">{slots.error}</Note> : <SlotPicker slots={slots.data ?? []} loading={slots.loading && !slots.data} value={start} onChange={setStart} showTimezone={false} />}
              </Section>
            </div>
            {booking}
          </div>
        </div>
      </div>

    </PublicLayout>
  );
}
