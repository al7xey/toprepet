import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, LESSON_MINUTES, staticTutors, type Tutor } from '../../api';
import { trackGoal } from '../../../shared/lib/analytics';
import { useQuery } from '../../api/hooks';
import { useSession } from '../../api/session';
import { PublicLayout } from '../../layout/layouts';
import { count, fromRub, minutes, rub, whenLabel } from '../../lib/format';
import { rv } from '../../reveal';
import { BackLink, Button, EmptyState, Icon, IconButton, Note, QueryView, Rows, Section, SlotPicker, Stats, Status, Tags } from '../../ui';
import { NotFoundBody } from './notfound';

const ACH_ICONS = ['target', 'school', 'book'] as const;

/** Анкета репетитора: данные, календарь записи, цены, отзывы. Карточка записи справа (на телефоне — панель снизу). */
export default function ProfilePage() {
  const { id = '' } = useParams();
  const initial = useMemo(() => staticTutors().find((t) => t.id === id), [id]);
  const tutorQuery = useQuery(`tutor-${id}`, () => api.getTutor(id), initial);
  const tutor = tutorQuery.data;
  if (!tutor && !tutorQuery.loading) {
    return <PublicLayout tight><NotFoundBody title="Анкета не найдена" text="Возможно, ссылка устарела или анкета снята с публикации." action={<Button to="/teachers" size="lg">К преподавателям</Button>} /></PublicLayout>;
  }
  if (!tutor) return <PublicLayout tight><div /></PublicLayout>;
  return <Profile tutor={tutor} />;
}

function Profile({ tutor }: { tutor: Tutor }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const [start, setStart] = useState<string | null>(null);
  const from = useMemo(() => new Date().toISOString(), []);
  const slots = useQuery(`slots-${tutor.id}`, () => api.getTutorSlots(tutor.id, from, 14));
  const reviews = useQuery(`reviews-${tutor.id}`, () => api.getTutorReviews(tutor.id));
  const isTutorAccount = user?.role === 'tutor' || user?.role === 'admin';
  const location = useLocation();
  // назад — по истории, если она есть; иначе к каталогу
  const close = () => { if (location.key !== 'default') void navigate(-1); else void navigate('/teachers'); };
  const share = () => {
    const url = window.location.href;
    if (navigator.share) void navigator.share({ title: tutor.name, url }).catch(() => undefined);
    else void navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  const bookHref = (kind: 'regular' | 'intro') => `/book/${tutor.id}?kind=${kind}${start ? `&start=${encodeURIComponent(start)}` : ''}`;
  const write = () => navigate(`/me/chats/new?tutor=${tutor.id}`);

  const stats: [string, string][] = [
    [rub(tutor.studentPrice), `за ${LESSON_MINUTES} мин`],
    tutor.rating ? [String(tutor.rating).replace('.', ','), count(tutor.reviewsCount, 'отзыв', 'отзыва', 'отзывов')] : ['Новый', 'репетитор'],
    tutor.introMinutes ? [minutes(tutor.introMinutes).replace(' минут', ' мин').replace(' минуты', ' мин'), 'знакомство'] : ['Онлайн', 'формат'],
    [tutor.experience, 'опыт'],
  ];

  const booking = (
    <div className="card sum" {...rv('right', 0.1)}>
      <h2 className="trk-cardtitle">Запись</h2>
      <Rows boxed rows={[['Репетитор', tutor.name], ['Занятие', minutes(LESSON_MINUTES)], ['Когда', start ? whenLabel(start) : 'Выберите время'], ...(tutor.introMinutes ? [['Знакомство', `${minutes(tutor.introMinutes)}, бесплатно`] as [string, string]] : [])]} />
      <div className="fr fb"><span>Цена за {minutes(LESSON_MINUTES)}</span><b className="tn trk-price-xl">{rub(tutor.studentPrice)}</b></div>
      {isTutorAccount ? <Note tone="plain">Записываться могут ученики. Войдите в аккаунт ученика.</Note> : (
        <>
          <Button to={bookHref('regular')} size="lg" block disabled={!start} onClick={() => trackGoal('book_start', { kind: 'regular' })}>{start ? 'Записаться' : 'Выберите время'}</Button>
          {tutor.introMinutes > 0 && <Button to={bookHref('intro')} variant="soft" block icon="gift" onClick={() => trackGoal('book_start', { kind: 'intro' })}>Бесплатное знакомство</Button>}
          <Button variant="fill" block icon="chat" onClick={write}>Написать репетитору</Button>
        </>
      )}
    </div>
  );

  return (
    <PublicLayout tight bareMobile>
      <div className="trh-pf-backwrap"><BackLink to="/teachers">Все преподаватели</BackLink></div>
      <div className="trh-pf">
        <div className="trh-pf-main">
          <section className="trh-pf-top">
            <div className="trh-pf-photo" {...rv('scale')}>
              <img src={tutor.photo} srcSet={tutor.photoSrcSet} sizes="(min-width: 761px) 300px, 100vw" alt={`Фото: ${tutor.name}`} fetchPriority="high" decoding="async" />
              <IconButton icon="back" label="Назад" onClick={close} surf className="trh-pf-back" />
              <IconButton icon="share" label="Поделиться" onClick={share} surf className="trh-pf-share" />
            </div>
            <div className="trh-pf-sheet">
              <div className="trh-sec" {...rv('up', 0.05)}>
                <h1 className="trh-h1">{tutor.name}</h1>
                <p className="muted trh-pf-role">{tutor.headline}</p>
                <div className="fr fw u-gap8">
                  {tutor.documentsVerified && <Status tone="ok" icon="shield">Документы проверены</Status>}
                  {tutor.introMinutes > 0 && <span className="trh-pf-intro-tag"><Icon name="gift" />Знакомство {tutor.introMinutes} мин</span>}
                </div>
              </div>
              <div {...rv('up', 0.1)}><Stats items={stats} /></div>
              <p className="trh-pf-intro" {...rv('up', 0.15)}>{tutor.intro}</p>
            </div>
          </section>

          <hr className="rule" />
          <Section title="Образование и достижения">
            <ul className="ach">
              {tutor.achievements.map((item, index) => (
                <li key={item.title} {...rv('up', index * 0.08)}>
                  <span className="ic-sq"><Icon name={ACH_ICONS[index % ACH_ICONS.length]} /></span>
                  <div><b>{item.title}</b><span className="d">{item.text}</span></div>
                </li>
              ))}
            </ul>
          </Section>

          <hr className="rule" />
          <div className="trh-pf-two">
            <Section title="Опыт"><div {...rv('up', 0.05)}><Tags items={[tutor.experience]} /></div></Section>
            <Section title="С чем поможет"><div {...rv('up', 0.05)}><Tags items={tutor.helpTopics} /></div></Section>
          </div>

          <hr className="rule" />
          <Section title="Свободное время">
            {slots.error ? <Note tone="bad">{slots.error}</Note> : <SlotPicker slots={slots.data ?? []} loading={slots.loading && !slots.data} value={start} onChange={setStart} />}
          </Section>

          <hr className="rule" />
          <Section title="Как проходят занятия"><p className="cap trh-pf-text" {...rv('up', 0.05)}>{tutor.approach}</p></Section>

          <hr className="rule" />
          <Section title="Цены">
            <div {...rv('up', 0.05)}>
              {tutor.introMinutes > 0 && <div className="rowline"><span><b>Знакомство</b><br /><span className="muted">{minutes(tutor.introMinutes)}, один раз</span></span><b className="u-ok">бесплатно</b></div>}
              <div className="rowline"><span><b>Занятие</b><br /><span className="muted">{minutes(LESSON_MINUTES)}</span></span><b className="tn">{rub(tutor.studentPrice)}</b></div>
            </div>
          </Section>

          <hr className="rule" />
          <Section title="Отзывы" action={tutor.reviewsCount > 3 ? <Link className="acc sb" to={`/teachers/${tutor.id}/reviews`}>Все отзывы</Link> : undefined}>
            <QueryView query={reviews} loading={<span />} empty={(list) => (list.length ? null : <EmptyState icon="chat" title="Отзывов пока нет" text="Отзывы появляются после оплаченных занятий." />)}>
              {(list) => (
                <div className="trk-list">
                  {list.slice(0, 3).map((r) => (
                    <div className="rv" key={r.id}>
                      <div className="fr fb"><b>{r.authorName}</b><span className="rt">{Array.from({ length: r.rating }, (_, i) => <Icon key={i} name="star-on" />)}</span></div>
                      <p>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </QueryView>
          </Section>
        </div>
        <aside className="trh-pf-aside" aria-label="Запись">{booking}</aside>
      </div>

      {!isTutorAccount && (
        <div className="actionbar surf trh-pf-bar">
          <div className="meta"><b className="tn">{start ? whenLabel(start) : fromRub(tutor.studentPrice)}</b><span>{start ? `${minutes(LESSON_MINUTES)} · ${rub(tutor.studentPrice)}` : 'Выберите время в календаре'}</span></div>
          <Button to={start ? bookHref('regular') : undefined} onClick={start ? undefined : () => document.querySelector('.trk-slots')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Записаться</Button>
        </div>
      )}
    </PublicLayout>
  );
}
