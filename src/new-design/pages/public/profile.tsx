import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, LESSON_MINUTES, staticTutors, type Tutor } from '../../api';
import { trackGoal } from '../../../shared/lib/analytics';
import { TutorMetadata } from '../../../app/tutor-metadata';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { count, minutes, rub, whenLabel } from '../../lib/format';
import { BackLink, Button, EmptyState, ErrorState, Icon, IconButton, LoadingList, Note, PageHeader, QueryView, Rows, Section, SelectField, SlotPicker, Status, Tags, TextField } from '../../ui';
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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [subject, setSubject] = useState(tutor.subjects[0] ?? '');
  const [topic, setTopic] = useState('');
  const from = useMemo(() => new Date().toISOString(), []);
  const slots = useQuery(`slots-${tutor.id}`, () => api.getTutorSlots(tutor.id, from, 14, Math.max(lessonMinutes, tutor.introMinutes)));
  const reviews = useQuery(`reviews-${tutor.id}`, () => api.getTutorReviews(tutor.id));
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

  const bookHref = (kind: 'regular' | 'intro') => `/book/${tutor.id}?kind=${kind}&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic.trim())}${start ? `&start=${encodeURIComponent(start)}` : ''}`;
  const write = () => navigate(`/me/chats/new?tutor=${tutor.id}`);


  const booking = (
    <div className="trh-sec trh-pf-booking">
      <h2 className="trk-cardtitle">Запись</h2>
      <SelectField label="Предмет" value={subject} onChange={(event) => setSubject(event.target.value)} options={tutor.subjects} />
      <TextField label="Тема занятия" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={200} placeholder="Что хотите разобрать на занятии" hint="Можно уточнить при знакомстве" />
      <Rows rows={[['Урок', minutes(lessonMinutes)], ['Время', start ? whenLabel(start) : 'Выберите время']]} />
      <div className="fr fb"><span>Цена за {minutes(lessonMinutes)}</span><b className="tn trk-price-xl">{rub(lessonPrice)}</b></div>
      {isTutorAccount ? <Note tone="plain">Записываться могут ученики. Войдите в аккаунт ученика.</Note> : (
        <>
          <Button to={bookHref('regular')} block disabled={!start} onClick={() => trackGoal('book_start', { kind: 'regular' })}>Записаться</Button>
          {tutor.introMinutes > 0 && <Button to={bookHref('intro')} variant="line" block disabled={!start} onClick={() => trackGoal('book_start', { kind: 'intro' })}>Бесплатное знакомство</Button>}
          <Button variant="line" block onClick={write}>Написать</Button>
        </>
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
                <div className="trh-pf-name-row"><h1 className="trh-h1" id="tutor-name">{tutor.name}</h1>{tutor.reviewsCount > 0 && <a className="trh-pf-rating" href="#reviews" aria-label={count(tutor.reviewsCount, 'отзыв', 'отзыва', 'отзывов')}><b>{String(tutor.rating).replace('.', ',')}</b><Icon name="star-on" /><span>{count(tutor.reviewsCount, 'отзыв', 'отзыва', 'отзывов')}</span></a>}</div>
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
          <div className="trh-pf-calendar">
            <Section title="Свободное время">
              {slots.error ? <Note tone="bad">{slots.error}</Note> : <SlotPicker slots={slots.data ?? []} loading={slots.loading && !slots.data} value={start} onChange={setStart} />}
            </Section>
          </div>
          {booking}

          <hr className="rule" />
          <Section id="reviews" title="Отзывы" action={tutor.reviewsCount > 3 ? <button type="button" className="acc sb" aria-expanded={showAllReviews} onClick={() => setShowAllReviews((v) => !v)}>{showAllReviews ? 'Свернуть' : 'Все отзывы'}</button> : undefined}>
            <QueryView query={reviews} loading={<span />} empty={(list) => (list.length ? null : <EmptyState icon="chat" title="Отзывов пока нет" text="Отзывы появляются после оплаченных занятий." />)}>
              {(list) => (
                <div className="trk-list">
                  {(showAllReviews ? list : list.slice(0, 3)).map((r) => (
                    <div className="rv" key={r.id}>
                      <div className="fr fb"><b>{r.authorName}</b><span className="rt">{Array.from({ length: r.rating }, (_, i) => <Icon key={i} name="star-on" />)}</span></div>
                      {r.authorNote && <span className="muted sm">{r.authorNote}</span>}
                      <p>{r.text}</p>
                      {r.reply && <div className="trk-review-reply"><b>Ответ репетитора</b><p>{r.reply}</p></div>}
                    </div>
                  ))}
                </div>
              )}
            </QueryView>
          </Section>
        </div>
      </div>

    </PublicLayout>
  );
}
